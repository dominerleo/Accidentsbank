import { NextResponse } from "next/server";
import {
  jsonError,
  requireAuth,
  getOptionalSupabase,
  UUID_RE,
  getUserRole,
  isStaffRole,
} from "@/lib/api/http";
import {
  rowToPost,
  bumpViewMetadata,
  persistPostMetadataSafe,
  type PostRow,
} from "@/lib/supabase/community";
import type { PostBodyFormat, PostStatus, PostType } from "@/types/community";

const POST_TYPES: PostType[] = [
  "discussion",
  "user_report",
  "link",
  "news_share",
];

const BODY_FORMATS: PostBodyFormat[] = ["plain", "markdown"];

const PATCH_STATUSES: PostStatus[] = [
  "published",
  "hidden",
  "draft",
];

interface PatchPostBody {
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

function patchMetadata(
  row: PostRow,
  body: PatchPostBody
): Record<string, unknown> | null {
  const hasMeta =
    body.metadata !== undefined ||
    body.region !== undefined ||
    body.locationText !== undefined;
  if (!hasMeta) return null;
  const base = {
    ...((row.metadata as Record<string, unknown> | null) ?? {}),
  };
  if (body.metadata && typeof body.metadata === "object") {
    Object.assign(base, body.metadata);
  }
  if (body.region !== undefined) {
    const r = body.region?.trim();
    if (r) base.region = r;
    else delete base.region;
  }
  if (body.locationText !== undefined) {
    const lt = body.locationText?.trim();
    if (lt) base.location_text = lt;
    else delete base.location_text;
  }
  return base;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return jsonError("invalid id", 400);
  }

  const sbOrErr = await getOptionalSupabase();
  if (sbOrErr instanceof NextResponse) return sbOrErr;

  const { data, error } = await sbOrErr
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }
  if (!data) {
    return jsonError("게시글을 찾을 수 없습니다.", 404);
  }

  const row = data as PostRow;
  const newMeta = bumpViewMetadata(row.metadata);
  await persistPostMetadataSafe(id, newMeta);

  const post = rowToPost({ ...row, metadata: newMeta });
  return NextResponse.json({ ok: true as const, post });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return jsonError("invalid id", 400);
  }

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: PatchPostBody;
  try {
    body = (await req.json()) as PatchPostBody;
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const { sb, userId } = auth;
  const role = await getUserRole(sb, userId);
  const staff = isStaffRole(role);

  const { data: existing, error: exErr } = await sb
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (exErr) return jsonError(exErr.message, 500);
  if (!existing) return jsonError("게시글을 찾을 수 없습니다.", 404);

  const updateRow: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) return jsonError("title은 비울 수 없습니다.", 400);
    updateRow.title = t;
  }
  const textBody =
    body.body !== undefined
      ? body.body
      : body.content !== undefined
        ? body.content
        : undefined;
  if (textBody !== undefined) updateRow.body = textBody;
  if (body.bodyExcerpt !== undefined) updateRow.body_excerpt = body.bodyExcerpt;
  if (body.postType !== undefined) {
    if (!POST_TYPES.includes(body.postType)) {
      return jsonError("유효하지 않은 postType 입니다.", 400);
    }
    updateRow.post_type = body.postType;
  }
  if (body.bodyFormat !== undefined) {
    if (!BODY_FORMATS.includes(body.bodyFormat)) {
      return jsonError("유효하지 않은 bodyFormat 입니다.", 400);
    }
    updateRow.body_format = body.bodyFormat;
  }
  if (body.status !== undefined) {
    if (!PATCH_STATUSES.includes(body.status)) {
      return jsonError(
        "유효하지 않은 status 입니다. (published, hidden, draft)",
        400
      );
    }
    updateRow.status = body.status;
  }
  if (body.linkedAccidentId !== undefined) {
    updateRow.linked_accident_id = body.linkedAccidentId;
  }
  if (body.newsCandidateId !== undefined) {
    updateRow.news_candidate_id = body.newsCandidateId;
  }

  let lat =
    body.lat !== undefined ? body.lat : body.latitude !== undefined
      ? body.latitude
      : undefined;
  let lng =
    body.lng !== undefined ? body.lng : body.longitude !== undefined
      ? body.longitude
      : undefined;
  if (lat !== undefined || lng !== undefined) {
    const la = lat ?? null;
    const ln = lng ?? null;
    if (
      (la !== null && ln === null) ||
      (la === null && ln !== null)
    ) {
      return jsonError("lat 과 lng 는 함께 지정해야 합니다.", 400);
    }
    updateRow.lat = la;
    updateRow.lng = ln;
  }

  const metaPatch = patchMetadata(existing as PostRow, body);
  if (metaPatch !== null) {
    updateRow.metadata = metaPatch;
  }

  if (Object.keys(updateRow).length === 0) {
    return jsonError("수정할 필드가 없습니다.", 400);
  }

  let q = sb.from("posts").update(updateRow).eq("id", id);

  if (!staff) {
    q = q.eq("author_id", userId);
  }

  const { data, error } = await q.select("*").maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }
  if (!data) {
    return jsonError("수정할 수 없거나 게시글이 없습니다.", 403);
  }

  return NextResponse.json({
    ok: true as const,
    post: rowToPost(data as PostRow),
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return jsonError("invalid id", 400);
  }

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { sb, userId } = auth;
  const role = await getUserRole(sb, userId);
  const staff = isStaffRole(role);

  let q = sb
    .from("posts")
    .update({ status: "hidden" })
    .eq("id", id);

  if (!staff) {
    q = q.eq("author_id", userId);
  }

  const { data, error } = await q.select("*").maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }
  if (!data) {
    return jsonError("숨길 수 없거나 게시글이 없습니다.", 403);
  }

  return NextResponse.json({
    ok: true as const,
    post: rowToPost(data as PostRow),
  });
}
