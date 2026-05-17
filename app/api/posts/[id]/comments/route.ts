import { NextResponse } from "next/server";
import {
  jsonError,
  requireAuth,
  getOptionalSupabase,
  UUID_RE,
} from "@/lib/api/http";
import {
  rowToComment,
  bumpPostCommentCount,
  type CommentRow,
} from "@/lib/supabase/community";

interface CreateCommentBody {
  body?: string;
  parentId?: string | null;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await context.params;
  if (!UUID_RE.test(postId)) {
    return jsonError("invalid id", 400);
  }

  const sbOrErr = await getOptionalSupabase();
  if (sbOrErr instanceof NextResponse) return sbOrErr;

  const { data, error } = await sbOrErr
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonError(error.message, 500);
  }

  const comments = (data ?? []).map((r) => rowToComment(r as CommentRow));
  return NextResponse.json({ ok: true as const, comments });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await context.params;
  if (!UUID_RE.test(postId)) {
    return jsonError("invalid id", 400);
  }

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: CreateCommentBody;
  try {
    body = (await req.json()) as CreateCommentBody;
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const text = body.body?.trim();
  if (!text) {
    return jsonError("body는 필수입니다.", 400);
  }

  const parentId = body.parentId?.trim() || null;
  if (parentId && !UUID_RE.test(parentId)) {
    return jsonError("invalid parentId", 400);
  }

  const { sb, userId } = auth;

  const { data, error } = await sb
    .from("comments")
    .insert({
      post_id: postId,
      parent_id: parentId,
      author_id: userId,
      body: text,
    })
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  try {
    await bumpPostCommentCount(postId, 1);
  } catch {
    /* 서비스 롤 없으면 집계 스킵 */
  }

  return NextResponse.json(
    { ok: true as const, comment: rowToComment(data as CommentRow) },
    { status: 201 }
  );
}
