import { NextResponse } from "next/server";
import { jsonError, requireAuth, UUID_RE } from "@/lib/api/http";
import { rowToPost, type PostRow } from "@/lib/supabase/community";
import type { PostBodyFormat, PostStatus, PostType } from "@/types/community";

const POST_TYPES: PostType[] = [
  "discussion",
  "user_report",
  "link",
  "news_share",
];

const BODY_FORMATS: PostBodyFormat[] = ["plain", "markdown"];

const CREATE_STATUSES: PostStatus[] = ["published", "draft"];

interface CreatePostBody {
  boardId?: string;
  boardSlug?: string;
  title?: string;
  body?: string | null;
  content?: string | null;
  bodyExcerpt?: string | null;
  postType?: PostType;
  bodyFormat?: PostBodyFormat;
  status?: PostStatus;
  linkedAccidentId?: string | null;
  newsCandidateId?: string | null;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  region?: string | null;
  locationText?: string | null;
  metadata?: Record<string, unknown>;
}

function mergeMetadata(body: CreatePostBody): Record<string, unknown> {
  const base =
    body.metadata &&
    typeof body.metadata === "object" &&
    !Array.isArray(body.metadata)
      ? { ...body.metadata }
      : {};
  const region = body.region?.trim();
  const locationText = body.locationText?.trim();
  if (region) base.region = region;
  if (locationText) base.location_text = locationText;
  return base;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: CreatePostBody;
  try {
    body = (await req.json()) as CreatePostBody;
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const title = body.title?.trim();
  if (!title) {
    return jsonError("title은 필수입니다.", 400);
  }

  const textBody =
    body.body !== undefined && body.body !== null
      ? body.body
      : body.content !== undefined && body.content !== null
        ? body.content
        : null;

  const boardIdRaw = body.boardId?.trim();
  const boardSlug = body.boardSlug?.trim();
  if (boardIdRaw && !UUID_RE.test(boardIdRaw)) {
    return jsonError("boardId 형식이 올바르지 않습니다.", 400);
  }
  if (!boardIdRaw && !boardSlug) {
    return jsonError("boardId 또는 boardSlug가 필요합니다.", 400);
  }

  const postType: PostType = body.postType ?? "discussion";
  if (!POST_TYPES.includes(postType)) {
    return jsonError("유효하지 않은 postType 입니다.", 400);
  }

  const bodyFormat: PostBodyFormat = body.bodyFormat ?? "plain";
  if (!BODY_FORMATS.includes(bodyFormat)) {
    return jsonError("유효하지 않은 bodyFormat 입니다.", 400);
  }

  const status: PostStatus = body.status ?? "published";
  if (!CREATE_STATUSES.includes(status)) {
    return jsonError(
      "생성 시 status는 published 또는 draft 만 가능합니다.",
      400
    );
  }

  let lat = body.lat ?? body.latitude ?? null;
  let lng = body.lng ?? body.longitude ?? null;
  if (
    (lat !== null && lng === null) ||
    (lat === null && lng !== null)
  ) {
    return jsonError("lat 과 lng 는 함께 지정하거나 모두 생략해야 합니다.", 400);
  }

  const { sb, userId } = auth;

  let resolvedBoardId = boardIdRaw ?? "";
  if (!resolvedBoardId && boardSlug) {
    const { data: b, error: be } = await sb
      .from("boards")
      .select("id")
      .eq("slug", boardSlug)
      .maybeSingle();
    if (be) return jsonError(be.message, 500);
    if (!b) return jsonError("게시판을 찾을 수 없습니다.", 404);
    resolvedBoardId = b.id as string;
  }

  const metadata = mergeMetadata(body);

  const insert = {
    board_id: resolvedBoardId,
    author_id: userId,
    post_type: postType,
    title,
    body: textBody,
    body_excerpt: body.bodyExcerpt ?? null,
    body_format: bodyFormat,
    linked_accident_id: body.linkedAccidentId ?? null,
    news_candidate_id: body.newsCandidateId ?? null,
    lat,
    lng,
    status,
    metadata,
  };

  const { data, error } = await sb
    .from("posts")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json(
    { ok: true as const, post: rowToPost(data as PostRow) },
    { status: 201 }
  );
}
