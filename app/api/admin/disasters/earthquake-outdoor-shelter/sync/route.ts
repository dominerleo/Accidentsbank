import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/public-safety/adminAuth";
import {
  fetchEarthquakeOutdoorShelterRaw,
  normalizeEarthquakeOutdoorShelterItem,
  parseTsunamiResponse,
} from "@/lib/disasters/safetydataEarthquakeOutdoorShelter";
import type { NormalizedTsunamiEvacuationItem } from "@/lib/disasters/safetydataTsunamiEvacuation";
import { batchGeocodeAddresses } from "@/lib/kakao/geocodeAddress";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_NUM_OF_ROWS = 50;
const MAX_NUM_OF_ROWS = 200;
const GEOCODE_CONCURRENCY = 5;
const CACHE_CATEGORY = "earthquake_outdoor_shelter";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function parsePositiveInt(
  raw: unknown,
  fallback: number,
  max?: number
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const i = Math.floor(n);
  if (max != null) return Math.min(i, max);
  return i;
}

type SyncBody = {
  pageNo?: number;
  numOfRows?: number;
};

async function readBody(req: Request): Promise<SyncBody> {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return {};
    const text = await req.text();
    if (!text) return {};
    const json = JSON.parse(text) as unknown;
    if (json && typeof json === "object") {
      const o = json as Record<string, unknown>;
      return {
        pageNo: typeof o.pageNo === "number" ? o.pageNo : undefined,
        numOfRows: typeof o.numOfRows === "number" ? o.numOfRows : undefined,
      };
    }
    return {};
  } catch {
    return {};
  }
}

type CacheRow = {
  source_type: string;
  source_name: string;
  source_record_key: string;
  category: string;
  display_address: string;
  address_for_geocoding: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  latitude: number | null;
  longitude: number | null;
  fetched_at: string;
  expires_at: string | null;
};

function buildRow(
  item: NormalizedTsunamiEvacuationItem,
  coords: { latitude: number; longitude: number } | null,
  fetchedAt: Date
): CacheRow {
  const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);
  const display =
    item.name && item.name.trim()
      ? `${item.name.trim()} (${item.displayAddress})`
      : item.displayAddress;
  const lat = item.latitude ?? coords?.latitude ?? null;
  const lng = item.longitude ?? coords?.longitude ?? null;
  return {
    source_type: item.sourceType,
    source_name: item.sourceName,
    source_record_key: item.id,
    category: CACHE_CATEGORY,
    display_address: display,
    address_for_geocoding: item.addressForGeocoding,
    sido: item.sido,
    sigungu: item.sigungu,
    eupmyeondong: item.eupmyeondong,
    ri: item.ri,
    latitude: lat,
    longitude: lng,
    fetched_at: fetchedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * POST /api/admin/disasters/earthquake-outdoor-shelter/sync
 *
 * safetydata.go.kr DSSP-IF-00103 → 캐시. 위경도 없거나 비정상이면 카카오 지오코딩.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await checkAdminAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.status }
    );
  }

  const serviceKey = process.env.SAFETYDATA_API_KEY?.trim();
  if (!serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "safetydata.go.kr API 키가 설정되지 않았습니다.",
        code: "safetydata_api_key_missing",
      },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const body = await readBody(req);
  const pageNo = parsePositiveInt(
    body.pageNo ?? url.searchParams.get("pageNo"),
    1
  );
  const numOfRows = parsePositiveInt(
    body.numOfRows ?? url.searchParams.get("numOfRows"),
    DEFAULT_NUM_OF_ROWS,
    MAX_NUM_OF_ROWS
  );

  let raw: { json: unknown; status: number };
  try {
    raw = await fetchEarthquakeOutdoorShelterRaw({
      serviceKey,
      pageNo,
      numOfRows,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    if (code === "upstream_not_json") {
      return NextResponse.json(
        { ok: false, error: "safetydata 응답이 JSON 이 아닙니다." },
        { status: 502 }
      );
    }
    console.error("[disasters/earthquake-outdoor-shelter/sync] fetch failed");
    return NextResponse.json(
      { ok: false, error: "safetydata API 호출에 실패했습니다." },
      { status: 502 }
    );
  }

  if (raw.status < 200 || raw.status >= 300) {
    return NextResponse.json(
      { ok: false, error: "safetydata API 요청이 실패했습니다." },
      { status: 502 }
    );
  }

  let parsed;
  try {
    parsed = parseTsunamiResponse(raw.json);
  } catch {
    return NextResponse.json(
      { ok: false, error: "safetydata 응답 형식을 해석할 수 없습니다." },
      { status: 502 }
    );
  }

  const code = parsed.headerResultCode;
  if (code && code !== "0" && code !== "00") {
    return NextResponse.json(
      {
        ok: false,
        error: "safetydata API 오류",
        code,
        message: parsed.headerResultMsg || undefined,
      },
      { status: 502 }
    );
  }

  const normalizedAll = parsed.items.map((rawItem, index) =>
    normalizeEarthquakeOutdoorShelterItem(rawItem, pageNo, index)
  );

  const usable: NormalizedTsunamiEvacuationItem[] = [];
  let skipped = 0;
  for (const n of normalizedAll) {
    if (
      !n.addressForGeocoding ||
      n.addressForGeocoding === "(주소 요약 없음)"
    ) {
      skipped += 1;
      continue;
    }
    usable.push(n);
  }

  if (usable.length === 0) {
    return NextResponse.json({
      ok: true,
      fetched: parsed.items.length,
      upserted: 0,
      geocodeFailed: 0,
      hadCoords: 0,
      skipped,
      pageNo,
      numOfRows,
      totalCount: parsed.totalCount,
    });
  }

  const needGeocodeIdx: number[] = [];
  const needGeocodeAddr: string[] = [];
  for (let i = 0; i < usable.length; i += 1) {
    const u = usable[i];
    if (u.latitude == null || u.longitude == null) {
      needGeocodeIdx.push(i);
      needGeocodeAddr.push(u.addressForGeocoding);
    }
  }
  const geocoded = await batchGeocodeAddresses(
    needGeocodeAddr,
    GEOCODE_CONCURRENCY
  );

  let geocodeFailed = 0;
  let hadCoords = 0;
  const fetchedAt = new Date();
  const rows: CacheRow[] = usable.map((u, i) => {
    const localIdx = needGeocodeIdx.indexOf(i);
    const coords = localIdx === -1 ? null : geocoded[localIdx] ?? null;
    if (u.latitude != null && u.longitude != null) {
      hadCoords += 1;
    } else if (!coords) {
      geocodeFailed += 1;
    }
    return buildRow(u, coords, fetchedAt);
  });

  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "supabase_admin_unavailable";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const seen = new Set<string>();
  const deduped: CacheRow[] = [];
  for (const r of rows) {
    if (seen.has(r.source_record_key)) continue;
    seen.add(r.source_record_key);
    deduped.push(r);
  }

  const keys = deduped
    .map((r) => r.source_record_key)
    .filter((k): k is string => typeof k === "string" && k.length > 0);

  const SOURCE_FILTER = "safetydata_earthquake_outdoor_shelter";

  const { data: existingRows, error: selErr } = await supabase
    .from("public_safety_address_cache")
    .select("source_record_key")
    .eq("source_type", SOURCE_FILTER)
    .in("source_record_key", keys);
  if (selErr) {
    console.error(
      "[disasters/earthquake-outdoor-shelter/sync] select failed:",
      selErr.message
    );
    return NextResponse.json(
      { ok: false, error: "기존 행 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const existingSet = new Set(
    (existingRows ?? []).map((r) => r.source_record_key as string)
  );
  const insertRows = deduped.filter((r) => !existingSet.has(r.source_record_key));
  const updateRows = deduped.filter((r) =>
    existingSet.has(r.source_record_key)
  );

  let inserted = 0;
  if (insertRows.length > 0) {
    const { data: insData, error: insErr } = await supabase
      .from("public_safety_address_cache")
      .insert(insertRows)
      .select("id");
    if (insErr) {
      console.error(
        "[disasters/earthquake-outdoor-shelter/sync] insert failed:",
        insErr.message
      );
      return NextResponse.json(
        { ok: false, error: "캐시에 저장하지 못했습니다." },
        { status: 500 }
      );
    }
    inserted = insData?.length ?? 0;
  }

  let updated = 0;
  for (const r of updateRows) {
    const { error: updErr } = await supabase
      .from("public_safety_address_cache")
      .update({
        display_address: r.display_address,
        address_for_geocoding: r.address_for_geocoding,
        sido: r.sido,
        sigungu: r.sigungu,
        eupmyeondong: r.eupmyeondong,
        ri: r.ri,
        latitude: r.latitude,
        longitude: r.longitude,
        fetched_at: r.fetched_at,
        expires_at: r.expires_at,
      })
      .eq("source_type", r.source_type)
      .eq("source_record_key", r.source_record_key);
    if (updErr) {
      console.error(
        "[disasters/earthquake-outdoor-shelter/sync] update failed:",
        updErr.message
      );
      continue;
    }
    updated += 1;
  }

  return NextResponse.json({
    ok: true,
    fetched: parsed.items.length,
    upserted: inserted + updated,
    geocodeFailed,
    hadCoords,
    skipped,
    pageNo,
    numOfRows,
    totalCount: parsed.totalCount,
    auth: { via: auth.via },
  });
}
