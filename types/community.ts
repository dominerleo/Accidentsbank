import type { AppLocale } from "./locale";

/** JSONB name_i18n / description_i18n — 최소 ko/en 키 권장 */
export type I18nTextJson = Partial<Record<AppLocale, string>> & {
  ko?: string;
  en?: string;
};

export function pickI18nText(
  json: I18nTextJson | null | undefined,
  locale: AppLocale,
  fallback = ""
): string {
  if (!json) return fallback;
  const v = json[locale] ?? json.ko ?? json.en;
  return v ?? fallback;
}

// --- Status unions (앱·DB 공통; DB에 없는 값은 향후 마이그레이션으로 추가 가능) ---

/** 게시글 노출·검수 상태 */
export type PostStatus =
  | "published"
  | "hidden"
  | "deleted"
  | "pending_review"
  /** DB MVP 마이그레이션과 호환 */
  | "draft";

/** 사고·기사·게시 정보의 검증/출처 신뢰도 (메타데이터·UI용) */
export type VerificationStatus =
  | "verified"
  | "sourced"
  | "community"
  | "unconfirmed"
  | "disputed";

/** 뉴스 후보 파이프라인 상태 */
export type NewsCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "duplicate"
  /** DB에서 accidents 연결 완료 시 */
  | "linked";

/** 게시판(시드 slug) — 한/영 라벨은 BOARD_CATEGORY_LABELS */
export type BoardCategory =
  | "accident-report"
  | "crime-incident"
  | "dashcam"
  | "news-discussion"
  | "regional"
  | "free";

export const BOARD_CATEGORY_ORDER: readonly BoardCategory[] = [
  "accident-report",
  "crime-incident",
  "dashcam",
  "news-discussion",
  "regional",
  "free",
] as const;

export type BoardLifecycleStatus = "active" | "archived" | "hidden";

export type AccidentSourceKind = "media" | "official" | "aggregator" | "user";

export type AccidentSourceRecordStatus = "active" | "archived";

export type PostType =
  | "discussion"
  | "user_report"
  | "link"
  | "news_share";

export type PostBodyFormat = "plain" | "markdown";

export type CommentVisibilityStatus = "visible" | "hidden";

export type PostReportWorkflowStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed";

// --- label_ko / label_en ---

export interface StatusLabels {
  label_ko: string;
  label_en: string;
}

export const POST_STATUS_LABELS: Record<PostStatus, StatusLabels> = {
  published: { label_ko: "게시됨", label_en: "Published" },
  hidden: { label_ko: "숨김", label_en: "Hidden" },
  deleted: { label_ko: "삭제됨", label_en: "Deleted" },
  pending_review: { label_ko: "검수 대기", label_en: "Pending review" },
  draft: { label_ko: "임시저장", label_en: "Draft" },
};

export const VERIFICATION_STATUS_LABELS: Record<
  VerificationStatus,
  StatusLabels
> = {
  verified: { label_ko: "검증됨", label_en: "Verified" },
  sourced: { label_ko: "출처 확인", label_en: "Sourced" },
  community: { label_ko: "커뮤니티", label_en: "Community" },
  unconfirmed: { label_ko: "미확인", label_en: "Unconfirmed" },
  disputed: { label_ko: "이의 제기", label_en: "Disputed" },
};

export const NEWS_CANDIDATE_STATUS_LABELS: Record<
  NewsCandidateStatus,
  StatusLabels
> = {
  pending: { label_ko: "대기", label_en: "Pending" },
  approved: { label_ko: "승인", label_en: "Approved" },
  rejected: { label_ko: "반려", label_en: "Rejected" },
  duplicate: { label_ko: "중복", label_en: "Duplicate" },
  linked: { label_ko: "사고 연결됨", label_en: "Linked to accident" },
};

export const BOARD_CATEGORY_LABELS: Record<BoardCategory, StatusLabels> = {
  "accident-report": { label_ko: "사고제보", label_en: "Accident reports" },
  "crime-incident": { label_ko: "범죄/사건", label_en: "Crime & incidents" },
  dashcam: { label_ko: "블랙박스", label_en: "Dashcam" },
  "news-discussion": { label_ko: "뉴스토론", label_en: "News discussion" },
  regional: { label_ko: "지역게시판", label_en: "Local" },
  free: { label_ko: "자유게시판", label_en: "Free board" },
};

export function statusLabel(
  labels: StatusLabels,
  locale: AppLocale
): string {
  return locale === "en" ? labels.label_en : labels.label_ko;
}

export function postStatusLabel(
  status: PostStatus,
  locale: AppLocale
): string {
  return statusLabel(POST_STATUS_LABELS[status], locale);
}

export function verificationStatusLabel(
  status: VerificationStatus,
  locale: AppLocale
): string {
  return statusLabel(VERIFICATION_STATUS_LABELS[status], locale);
}

export function newsCandidateStatusLabel(
  status: NewsCandidateStatus,
  locale: AppLocale
): string {
  return statusLabel(NEWS_CANDIDATE_STATUS_LABELS[status], locale);
}

export function boardCategoryLabel(
  category: BoardCategory,
  locale: AppLocale
): string {
  return statusLabel(BOARD_CATEGORY_LABELS[category], locale);
}

// --- Row-shaped types (Supabase public 스키마에 맞춘 앱 레이어 표현, camelCase) ---

export interface AccidentSource {
  id: string;
  code: string;
  nameI18n: I18nTextJson;
  kind: AccidentSourceKind;
  baseUrl: string | null;
  isActive: boolean;
  status: AccidentSourceRecordStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsCandidate {
  id: string;
  accidentSourceId: string;
  externalArticleId: string | null;
  title: string;
  summaryShort: string | null;
  articleUrl: string | null;
  publishedAt: string | null;
  status: NewsCandidateStatus;
  linkedAccidentId: string | null;
  metadata: Record<string, unknown>;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  slug: string;
  nameI18n: I18nTextJson;
  descriptionI18n: I18nTextJson;
  sortOrder: number;
  isActive: boolean;
  status: BoardLifecycleStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  boardId: string;
  authorId: string;
  postType: PostType;
  title: string;
  body: string | null;
  bodyExcerpt: string | null;
  bodyFormat: PostBodyFormat;
  linkedAccidentId: string | null;
  newsCandidateId: string | null;
  lat: number | null;
  lng: number | null;
  status: PostStatus;
  isBlinded: boolean;
  blindReason: string | null;
  adminNotes: string | null;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  reportCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PostWithBoard extends Post {
  board: Board;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  body: string;
  isBlinded: boolean;
  status: CommentVisibilityStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostVote {
  postId: string;
  userId: string;
  value: -1 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reasonCode: string;
  detail: string | null;
  status: PostReportWorkflowStatus;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface UserPointsLedger {
  id: number;
  userId: string;
  delta: number;
  reasonCode: string;
  refType: string | null;
  refId: string | null;
  metadata: Record<string, unknown>;
  adminNotes: string | null;
  createdAt: string;
}
