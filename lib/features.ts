/**
 * Feature Flag 시스템.
 * 환경변수로 기능을 토글하여 점진적 출시 / A-B 테스트 / 비용 통제에 활용합니다.
 *
 * 기본값은 "안전한 비활성화" (false / noop) 로 설정합니다.
 * Phase 1 에서는 USER_REGISTRATION 만 활성화, 나머지는 추후 활성화.
 */

function flag(name: string, defaultValue = false): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultValue;
  return v === "true" || v === "1";
}

export const features = {
  /** 사용자 직접 사고 등록 (Phase 1) */
  USER_REGISTRATION: flag("FEATURE_USER_REGISTRATION", true),

  /** 네이버 뉴스 검색 통합 (Phase 2) */
  NEWS_SEARCH: flag("FEATURE_NEWS_SEARCH", false),

  /** 위키 데이터 임포트 (Phase 2) */
  WIKI_IMPORT: flag("FEATURE_WIKI_IMPORT", false),

  /** AI 분석 (Phase 3) - 활성화 시 OpenAI API 비용 발생 */
  AI_ENABLED: flag("FEATURE_AI_ENABLED", false),

  /** 타임라인 슬라이더 UI (Phase 4) */
  TIMELINE: flag("FEATURE_TIMELINE", false),

  /** 검수/승인 시스템 (미래) */
  MODERATION: flag("FEATURE_MODERATION", false),

  /** 미디어 첨부 (사진/영상) (미래) */
  MEDIA_UPLOAD: flag("FEATURE_MEDIA_UPLOAD", false),

  /** 글로벌 (해외) 모드 (미래) */
  GLOBAL_MODE: flag("FEATURE_GLOBAL_MODE", false),
} as const;

export type FeatureKey = keyof typeof features;

export function isEnabled(key: FeatureKey): boolean {
  return features[key];
}
