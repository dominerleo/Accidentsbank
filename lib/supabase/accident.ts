import {
  type Accident,
  type AccidentAddress,
  type AccidentCategory,
  type AccidentInput,
  type AccidentPatch,
  type AccidentSourceType,
  type LatLng,
  normalizeAccidentCategory,
} from "@/types";

/**
 * Supabase `public.accidents` 테이블 row 타입.
 * snake_case 그대로 받기 위함.
 */
export interface AccidentRow {
  id: string;
  category: string;
  title: string;
  description: string | null;
  occurred_at: string;
  lat: number;
  lng: number;
  road_address: string | null;
  jibun_address: string | null;
  region_1: string | null;
  region_2: string | null;
  region_3: string | null;
  source_type: string;
  news_url: string | null;
  metadata: Record<string, unknown> | null;
  confidence: number | null;
  verified_by: string | null;
  tags: string[] | null;
  media_urls: string[] | null;
  external_source_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** DB row → 도메인 Accident (camelCase) 변환 */
export function rowToAccident(row: AccidentRow): Accident {
  const address: AccidentAddress = {
    roadAddress: row.road_address ?? undefined,
    jibunAddress: row.jibun_address ?? undefined,
    region1: row.region_1 ?? undefined,
    region2: row.region_2 ?? undefined,
    region3: row.region_3 ?? undefined,
  };
  const location: LatLng = { lat: row.lat, lng: row.lng };
  return {
    id: row.id,
    category: normalizeAccidentCategory(row.category),
    title: row.title,
    description: row.description ?? undefined,
    occurredAt: row.occurred_at,
    location,
    address,
    newsUrl: row.news_url ?? undefined,
    sourceType: row.source_type as AccidentSourceType,
    metadata: row.metadata ?? undefined,
    confidence: row.confidence ?? undefined,
    verifiedBy: row.verified_by ?? undefined,
    tags: row.tags ?? undefined,
    mediaUrls: row.media_urls ?? undefined,
    createdBy: row.created_by ?? undefined,
    externalSourceId: row.external_source_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 도메인 AccidentInput → DB insert payload.
 * sourceType / createdBy 는 호출 측에서 지정 (서버 라우트가 인증 컨텍스트에 따라 결정).
 */
export interface InsertOverrides {
  sourceType?: string;
  createdBy?: string | null;
  confidence?: number;
  /** 배치 수집 upsert 용 (UNIQUE source_type + external_source_id) */
  externalSourceId?: string | null;
}

export function inputToInsertRow(
  input: AccidentInput,
  overrides: InsertOverrides = {}
) {
  return {
    category: input.category,
    title: input.title,
    description: input.description ?? null,
    occurred_at: new Date(input.occurredAt).toISOString(),
    lat: input.location.lat,
    lng: input.location.lng,
    road_address: input.address.roadAddress ?? null,
    jibun_address: input.address.jibunAddress ?? null,
    region_1: input.address.region1 ?? null,
    region_2: input.address.region2 ?? null,
    region_3: input.address.region3 ?? null,
    source_type: overrides.sourceType ?? "user",
    news_url: input.newsUrl ?? null,
    metadata: input.metadata ?? {},
    confidence: overrides.confidence ?? null,
    tags: input.tags ?? [],
    media_urls: input.mediaUrls ?? [],
    external_source_id: overrides.externalSourceId ?? null,
    created_by: overrides.createdBy ?? null,
  };
}

/** PATCH 용 snake 컬럼만 담은 객체 */
export function patchToAccidentRow(
  patch: AccidentPatch,
  opts: { allowSourceType?: boolean } = {}
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.occurredAt !== undefined) {
    row.occurred_at = new Date(patch.occurredAt).toISOString();
  }
  if (patch.location !== undefined) {
    row.lat = patch.location.lat;
    row.lng = patch.location.lng;
  }
  if (patch.address !== undefined) {
    const a = patch.address;
    if (a.roadAddress !== undefined) row.road_address = a.roadAddress ?? null;
    if (a.jibunAddress !== undefined) row.jibun_address = a.jibunAddress ?? null;
    if (a.region1 !== undefined) row.region_1 = a.region1 ?? null;
    if (a.region2 !== undefined) row.region_2 = a.region2 ?? null;
    if (a.region3 !== undefined) row.region_3 = a.region3 ?? null;
  }
  if (patch.newsUrl !== undefined) row.news_url = patch.newsUrl;
  if (opts.allowSourceType && patch.sourceType !== undefined) {
    row.source_type = patch.sourceType;
  }
  return row;
}
