export type AccidentCategory =
  | "traffic"
  | "crime"
  | "fire"
  | "fraud"
  | "disaster"
  | "etc";

export const ACCIDENT_CATEGORIES: Record<
  AccidentCategory,
  { label: string; color: string; icon: string }
> = {
  traffic: { label: "교통사고", color: "#ef4444", icon: "Car" },
  crime: { label: "강력범죄", color: "#7c3aed", icon: "Shield" },
  fire: { label: "화재", color: "#f97316", icon: "Flame" },
  fraud: { label: "사기", color: "#eab308", icon: "AlertTriangle" },
  disaster: { label: "재난/자연재해", color: "#0ea5e9", icon: "CloudLightning" },
  etc: { label: "기타", color: "#64748b", icon: "Circle" },
};

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

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  /** 미래 권한 확장 - "user" | "moderator" | "admin" */
  role: string;
  createdAt: string;
}
