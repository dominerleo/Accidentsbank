import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Board,
  Comment,
  Post,
  PostBodyFormat,
  PostReport,
  PostStatus,
  PostType,
  PostVote,
} from "@/types/community";

/** DB snake_case — `public.boards` */
export interface BoardRow {
  id: string;
  slug: string;
  name_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  sort_order: number;
  is_active: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** DB snake_case — `public.posts` */
export interface PostRow {
  id: string;
  board_id: string;
  author_id: string;
  post_type: string;
  title: string;
  body: string | null;
  body_excerpt: string | null;
  body_format: string;
  linked_accident_id: string | null;
  news_candidate_id: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  is_blinded: boolean;
  blind_reason: string | null;
  admin_notes: string | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  report_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  is_blinded: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostVoteRow {
  post_id: string;
  user_id: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface PostReportRow {
  id: string;
  post_id: string;
  reporter_id: string;
  reason_code: string;
  detail: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function rowToBoard(row: BoardRow): Board {
  return {
    id: row.id,
    slug: row.slug,
    nameI18n: row.name_i18n ?? {},
    descriptionI18n: row.description_i18n ?? {},
    sortOrder: row.sort_order,
    isActive: row.is_active,
    status: row.status as Board["status"],
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPost(row: PostRow): Post {
  return {
    id: row.id,
    boardId: row.board_id,
    authorId: row.author_id,
    postType: row.post_type as PostType,
    title: row.title,
    body: row.body,
    bodyExcerpt: row.body_excerpt,
    bodyFormat: row.body_format as PostBodyFormat,
    linkedAccidentId: row.linked_accident_id,
    newsCandidateId: row.news_candidate_id,
    lat: row.lat,
    lng: row.lng,
    status: row.status as PostStatus,
    isBlinded: row.is_blinded,
    blindReason: row.blind_reason,
    adminNotes: row.admin_notes,
    likeCount: row.like_count,
    dislikeCount: row.dislike_count,
    commentCount: row.comment_count,
    reportCount: row.report_count,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    body: row.body,
    isBlinded: row.is_blinded,
    status: row.status as Comment["status"],
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPostVote(row: PostVoteRow): PostVote {
  return {
    postId: row.post_id,
    userId: row.user_id,
    value: row.value === -1 ? -1 : 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPostReport(row: PostReportRow): PostReport {
  return {
    id: row.id,
    postId: row.post_id,
    reporterId: row.reporter_id,
    reasonCode: row.reason_code,
    detail: row.detail,
    status: row.status as PostReport["status"],
    adminNotes: row.admin_notes,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

/** 조회수 — metadata.views 정수 증가 (서비스 롤 업데이트와 함께 사용) */
export function bumpViewMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const m = { ...(metadata ?? {}) };
  const n = Number(m.views ?? m.viewCount ?? 0);
  m.views = Number.isFinite(n) ? n + 1 : 1;
  return m;
}

/** 추천/비추 집계 후 posts 카운트 동기화 (RLS 우회 — 타인 글에 대한 집계 갱신) */
export async function syncPostVoteCounts(postId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: votes, error } = await admin
    .from("post_votes")
    .select("value")
    .eq("post_id", postId);
  if (error) throw error;
  let likes = 0;
  let dislikes = 0;
  for (const v of votes ?? []) {
    if (v.value === 1) likes += 1;
    else if (v.value === -1) dislikes += 1;
  }
  const { error: upErr } = await admin
    .from("posts")
    .update({ like_count: likes, dislike_count: dislikes })
    .eq("id", postId);
  if (upErr) throw upErr;
}

export async function bumpPostCommentCount(
  postId: string,
  delta: number
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("posts")
    .select("comment_count")
    .eq("id", postId)
    .single();
  if (error) throw error;
  const cur = Number(row?.comment_count ?? 0);
  const next = Math.max(0, cur + delta);
  const { error: upErr } = await admin
    .from("posts")
    .update({ comment_count: next })
    .eq("id", postId);
  if (upErr) throw upErr;
}

export async function bumpPostReportCount(postId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("posts")
    .select("report_count")
    .eq("id", postId)
    .single();
  if (error) throw error;
  const cur = Number(row?.report_count ?? 0);
  const { error: upErr } = await admin
    .from("posts")
    .update({ report_count: cur + 1 })
    .eq("id", postId);
  if (upErr) throw upErr;
}

export async function persistPostMetadataSafe(
  postId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const admin = getSupabaseAdminClient();
    await admin.from("posts").update({ metadata }).eq("id", postId);
  } catch {
    /* SUPABASE_SERVICE_ROLE_KEY 미설정 등 */
  }
}
