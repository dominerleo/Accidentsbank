import type {
  Accident,
  AccidentAddress,
  AccidentCategory,
  AccidentInput,
  AccidentSourceType,
  LatLng,
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
    category: row.category as AccidentCategory,
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
    created_by: overrides.createdBy ?? null,
  };
}
