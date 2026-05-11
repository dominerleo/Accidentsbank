import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;
const PAGE_SIZE = 1000;
const DEFAULT_CATEGORY = "sex_offender_notice_address";

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max?: number
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const i = Math.floor(n);
  if (max != null) return Math.min(i, max);
  return i;
}

function parseFloatOrNull(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export type PublicSafetyAddressItem = {
  id: string;
  category: string;
  sourceType: string;
  sourceName: string;
  displayAddress: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  latitude: number;
  longitude: number;
  fetchedAt: string;
};

type RawRow = {
  id: string;
  category: string;
  source_type: string;
  source_name: string;
  display_address: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  latitude: number;
  longitude: number;
  fetched_at: string;
};

/**
 * GET /api/public-safety/address-cache
 *
 * 지도에 표시할 캐시된 공공안전 주소 정보(좌표 보유 항목만) 조회.
 *
 * - 정부 API를 직접 호출하지 않는다. Supabase 캐시(public_safety_address_cache)만 읽는다.
 * - 개인정보(이름·사진·범죄내용)는 캐시에 저장하지 않으므로 응답에도 포함되지 않는다.
 * - latitude/longitude 가 NULL 인 행은 제외해 지도 마커 그릴 수 있는 항목만 반환.
 *
 * Query params (모두 선택):
 *   - bbox=minLat,minLng,maxLat,maxLng
 *   - category=sex_offender_notice_address
 *     또는 category=tsunami_evacuation_site,earthquake_outdoor_shelter (콤마 구분 다중)
 *   - limit=1..5000  (기본 1000)
 *
 * 실패 시에도 지도 전체가 깨지지 않도록 200 + { ok:false, items:[] } 또는 4xx/5xx 를
 *  반환해 클라이언트에서 안전하게 처리하도록 한다.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const limit = parsePositiveInt(
    searchParams.get("limit"),
    DEFAULT_LIMIT,
    MAX_LIMIT
  );
  const categoryRaw = searchParams.get("category")?.trim() || DEFAULT_CATEGORY;
  const categories = categoryRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const bboxRaw = searchParams.get("bbox");
  let bbox: [number, number, number, number] | null = null;
  if (bboxRaw) {
    const parts = bboxRaw.split(",").map((p) => parseFloatOrNull(p));
    if (
      parts.length === 4 &&
      parts.every((p): p is number => p != null)
    ) {
      bbox = [parts[0], parts[1], parts[2], parts[3]];
    }
  }

  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "supabase_unavailable";
    return NextResponse.json(
      { ok: false, error: msg, items: [] },
      { status: 500 }
    );
  }

  const rows: RawRow[] = [];
  let offset = 0;

  while (rows.length < limit) {
    const pageLimit = Math.min(PAGE_SIZE, limit - rows.length);
    let query = supabase
      .from("public_safety_address_cache")
      .select(
        "id, category, source_type, source_name, display_address, sido, sigungu, eupmyeondong, ri, latitude, longitude, fetched_at"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("fetched_at", { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (categories.length <= 1) {
      query = query.eq("category", categories[0] ?? DEFAULT_CATEGORY);
    } else {
      query = query.in("category", categories);
    }

    if (bbox) {
      const [minLat, minLng, maxLat, maxLng] = bbox;
      query = query
        .gte("latitude", minLat)
        .lte("latitude", maxLat)
        .gte("longitude", minLng)
        .lte("longitude", maxLng);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[public-safety/address-cache] query failed:", error.message);
      return NextResponse.json(
        { ok: false, error: error.message, items: [] },
        { status: 500 }
      );
    }

    const pageRows = (data ?? []) as RawRow[];
    rows.push(...pageRows);
    if (pageRows.length < pageLimit) break;
    offset += pageLimit;
  }

  const items: PublicSafetyAddressItem[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    sourceType: r.source_type,
    sourceName: r.source_name,
    displayAddress: r.display_address,
    sido: r.sido,
    sigungu: r.sigungu,
    eupmyeondong: r.eupmyeondong,
    ri: r.ri,
    latitude: r.latitude,
    longitude: r.longitude,
    fetchedAt: r.fetched_at,
  }));

  return NextResponse.json({
    ok: true,
    items,
    count: items.length,
    category: categoryRaw,
    categories,
    limit,
    bbox,
  });
}
