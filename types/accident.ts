import type { AppLocale } from "./locale";

export type AccidentCategory = "incident" | "crime" | "news" | "etc" | "misc";

export const ACCIDENT_CATEGORIES: Record<
  AccidentCategory,
  { label: string; color: string; icon: string }
> = {
  incident: { label: "사고", color: "#ef4444", icon: "AlertCircle" },
  crime: { label: "범죄", color: "#7c3aed", icon: "Shield" },
  news: { label: "뉴스", color: "#3b82f6", icon: "Newspaper" },
  etc: { label: "이벤트", color: "#64748b", icon: "Circle" },
  misc: { label: "기타", color: "#94a3b8", icon: "Ellipsis" },
};

/** 지도·필터 UI 순서 */
export const ACCIDENT_CATEGORY_ORDER: AccidentCategory[] = [
  "incident",
  "crime",
  "news",
  "etc",
  "misc",
];

const VALID_CATEGORY = new Set<string>(ACCIDENT_CATEGORY_ORDER);

/**
 * CSV·한글 별칭 정규화.
 * - event, 이벤트 → etc
 * - 기타(한글), misc, other → misc (DB 기타)
 * - 그 외 미지정 값은 etc(이벤트)로 수렴 (레거시 호환)
 */
export function normalizeAccidentCategory(raw: string): AccidentCategory {
  const lower = raw.trim().toLowerCase();
  if (lower === "event" || lower === "이벤트") return "etc";
  if (lower === "기타" || lower === "misc" || lower === "other") return "misc";
  return VALID_CATEGORY.has(lower) ? (lower as AccidentCategory) : "etc";
}

const CATEGORY_LABEL_EN: Record<AccidentCategory, string> = {
  incident: "Incident",
  crime: "Crime",
  news: "News",
  etc: "Event",
  misc: "Other",
};

/** 알 수 없는 카테고리가 들어와도 흰 화면이 되지 않도록 사용하는 fallback 메타. */
export const ACCIDENT_CATEGORY_FALLBACK = {
  label: "기타",
  color: "#94a3b8",
  icon: "Circle",
} as const;

export function getAccidentCategoryMeta(cat: string | null | undefined) {
  if (cat && cat in ACCIDENT_CATEGORIES) {
    return ACCIDENT_CATEGORIES[cat as AccidentCategory];
  }
  return ACCIDENT_CATEGORY_FALLBACK;
}

export function accidentCategoryLabel(
  cat: AccidentCategory | string | null | undefined,
  locale: AppLocale
): string {
  if (locale === "en") {
    if (cat && cat in CATEGORY_LABEL_EN) {
      return CATEGORY_LABEL_EN[cat as AccidentCategory];
    }
    return "Other";
  }
  return getAccidentCategoryMeta(cat).label;
}

/**
 * 출처 타입 - 새 출처는 string 으로 자유롭게 추가 가능 (DB 스키마 변경 불필요).
 * 표준 값:
 *   - "user"     : 로그인 사용자가 직접 등록
 *   - "official" : 공공데이터 (TAAS, 소방청, 경찰청 등)
 *   - "news"     : 뉴스 기사 검색
 *   - "wiki"     : 나무위키 / 위키백과
 *   - "ai"       : AI 자동 분석/추론
 */
export type AccidentSourceType = "user" | "official" | "news" | "wiki" | "ai" | string;

export const SOURCE_META: Record<string, { label: string; color: string; ring: string }> = {
  user: { label: "사용자", color: "#22c55e", ring: "ring-green-300" },
  official: { label: "공식", color: "#64748b", ring: "ring-slate-400" },
  news: { label: "뉴스", color: "#3b82f6", ring: "ring-blue-300" },
  wiki: { label: "위키", color: "#a855f7", ring: "ring-purple-300" },
  ai: { label: "AI", color: "#eab308", ring: "ring-yellow-300" },
};

const SOURCE_LABEL_EN: Record<string, string> = {
  user: "User",
  official: "Official",
  news: "News",
  wiki: "Wiki",
  ai: "AI",
};

export function sourceTypeLabel(raw: string, locale: AppLocale): string {
  if (locale === "en") {
    return SOURCE_LABEL_EN[raw] ?? raw;
  }
  return SOURCE_META[raw]?.label ?? raw;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AccidentAddress {
  roadAddress?: string;
  jibunAddress?: string;
  regionCode?: string;
  region1?: string;
  region2?: string;
  region3?: string;
}

export interface Accident {
  id: string;
  category: AccidentCategory;
  title: string;
  description?: string;
  occurredAt: string;
  location: LatLng;
  address: AccidentAddress;
  newsUrl?: string;
  sourceType: AccidentSourceType;
  /** 출처별 추가 정보 (jsonb 로 저장) - 기사 링크, 위키 URL, AI confidence 등 자유롭게 */
  metadata?: Record<string, unknown>;
  /** 신뢰도 (AI/검수) 0~1 - 미래 활용 */
  confidence?: number;
  /** 검수자 user_id - 미래 활용 */
  verifiedBy?: string;
  /** 자유 태그 */
  tags?: string[];
  /** 사진/영상 링크 */
  mediaUrls?: string[];
  /** 배치 수집 시 출처 고유 ID (DB external_source_id) */
  externalSourceId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccidentInput {
  category: AccidentCategory;
  title: string;
  description?: string;
  occurredAt: string;
  location: LatLng;
  address: AccidentAddress;
  newsUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  mediaUrls?: string[];
}

/** PATCH /api/accidents/:id 용 부분 업데이트 */
export interface AccidentPatch {
  category?: AccidentCategory;
  title?: string;
  description?: string | null;
  occurredAt?: string;
  location?: LatLng;
  address?: Partial<AccidentAddress>;
  newsUrl?: string | null;
  /** admin/moderator 만 API 에서 허용 */
  sourceType?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  /** 미래 권한 확장 - "user" | "moderator" | "admin" */
  role: string;
  createdAt: string;
}
