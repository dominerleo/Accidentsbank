import { NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/public-safety/adminAuth";
import {
  fetchGov24SexOffenderAddressesRaw,
  normalizeSexOffenderAddressItem,
  parseGov24SaisResponse,
  type NormalizedSexOffenderAddressItem,
} from "@/lib/public-safety/gov24SexOffenderAddress";
import { batchGeocodeAddresses } from "@/lib/kakao/geocodeAddress";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_NUM_OF_ROWS = 20;
const MAX_NUM_OF_ROWS = 100;
const GEOCODE_CONCURRENCY = 5;

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

type CacheRowInsert = {
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

function buildCacheRow(
  item: NormalizedSexOffenderAddressItem,
  coords: { latitude: number; longitude: number } | null,
  fetchedAt: Date
): CacheRowInsert {
  // 30일 캐시 만료 (좌표 갱신/재수집 주기 정책)
  const expiresAt = new Date(fetchedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    source_type: item.sourceType,
    source_name: item.sourceName,
    source_record_key: item.id,
    category: "sex_offender_notice_address",
    display_address: item.displayAddress,
    address_for_geocoding: item.addressForGeocoding,
    sido: item.sido,
    sigungu: item.sigungu,
    eupmyeondong: item.eupmyeondong,
    ri: item.ri,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    fetched_at: fetchedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * POST /api/admin/public-safety/sync
 *
 * 정부24 공공데이터 → 카카오 지오코딩 → public_safety_address_cache 동기화.
 *
 * 요청 (선택 JSON 본문 또는 쿼리스트링):
 *   - pageNo: 1 이상 (기본 1)
 *   - numOfRows: 1..100 (기본 20)
 *
 * 응답:
 *   { ok: true, fetched, upserted, geocodeFailed, skipped, pageNo, numOfRows, totalCount }
 *
 * 권한:
 *   - profiles.role IN ('admin','moderator') 또는 ADMIN_EMAILS 포함 사용자만.
 *
 * 보안:
 *   - GOV24_API_KEY 는 응답·로그·에러메시지 어디에도 노출하지 않는다.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const auth = await checkAdminAuth();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.reason },
      { status: auth.status }
    );
  }

  const serviceKey = process.env.GOV24_API_KEY?.trim();
  if (!serviceKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "공공데이터 API 키가 설정되지 않았습니다.",
        code: "gov24_api_key_missing",
      },
      { status: 500 }
    );
  }

  // 본문/쿼리 모두 지원 (편의용)
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

  // 1) 정부24 OpenAPI 호출
  let raw: { json: unknown; status: number };
  try {
    raw = await fetchGov24SexOffenderAddressesRaw({
      serviceKey,
      pageNo,
      numOfRows,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    if (code === "upstream_not_json") {
      return NextResponse.json(
        { ok: false, error: "공공데이터 응답이 JSON이 아닙니다." },
        { status: 502 }
      );
    }
    // 메시지에 키가 들어갈 수 있으므로 그대로 노출하지 않는다.
    console.error("[public-safety/sync] gov24 fetch failed");
    return NextResponse.json(
      { ok: false, error: "공공데이터 API 호출에 실패했습니다." },
      { status: 502 }
    );
  }

  if (raw.status < 200 || raw.status >= 300) {
    return NextResponse.json(
      { ok: false, error: "공공데이터 API 요청이 실패했습니다." },
      { status: 502 }
    );
  }

  let parsed;
  try {
    parsed = parseGov24SaisResponse(raw.json);
  } catch {
    return NextResponse.json(
      { ok: false, error: "공공데이터 응답 형식을 해석할 수 없습니다." },
      { status: 502 }
    );
  }

  if (parsed.headerResultCode && parsed.headerResultCode !== "00") {
    return NextResponse.json(
      {
        ok: false,
        error: "공공데이터 API 오류",
        code: parsed.headerResultCode,
        message: parsed.headerResultMsg || undefined,
      },
      { status: 502 }
    );
  }

  // 2) 정규화
  const normalizedAll = parsed.items.map((rawItem, index) =>
    normalizeSexOffenderAddressItem(rawItem, pageNo, index)
  );

  // displayAddress 가 비어있는 등 명백히 의미없는 항목은 skipped 로 분류.
  const usable: NormalizedSexOffenderAddressItem[] = [];
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
      skipped,
      pageNo,
      numOfRows,
      totalCount: parsed.totalCount,
    });
  }

  // 3) 카카오 지오코딩 (병렬도 제한)
  const addresses = usable.map((u) => u.addressForGeocoding);
  const geocoded = await batchGeocodeAddresses(addresses, GEOCODE_CONCURRENCY);

  let geocodeFailed = 0;
  const fetchedAt = new Date();
  const rows: CacheRowInsert[] = usable.map((u, idx) => {
    const coords = geocoded[idx];
    if (!coords) geocodeFailed += 1;
    return buildCacheRow(u, coords, fetchedAt);
  });

  // 4) Supabase upsert (service_role 사용 → RLS 우회)
  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "supabase_admin_unavailable";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("public_safety_address_cache")
    .upsert(rows, {
      onConflict: "source_type,source_record_key",
      ignoreDuplicates: false,
    })
    .select("id");

  if (upsertError) {
    // upstream 키가 들어갈 가능성은 없지만 안전하게 message 만 전달.
    console.error("[public-safety/sync] upsert failed:", upsertError.message);
    return NextResponse.json(
      {
        ok: false,
        error: "캐시 테이블에 저장하지 못했습니다.",
        message: upsertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    fetched: parsed.items.length,
    upserted: upserted?.length ?? 0,
    geocodeFailed,
    skipped,
    pageNo,
    numOfRows,
    totalCount: parsed.totalCount,
    auth: { via: auth.via },
  });
}
