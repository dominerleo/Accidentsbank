import { NextResponse } from "next/server";
import { jsonError, getOptionalSupabase } from "@/lib/api/http";
import {
  rowToBoard,
  rowToPost,
  type BoardRow,
  type PostRow,
} from "@/lib/supabase/community";
import type { PostWithBoard } from "@/types/community";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!slug?.trim()) {
    return jsonError("slug이 필요합니다.", 400);
  }

  const sbOrErr = await getOptionalSupabase();
  if (sbOrErr instanceof NextResponse) return sbOrErr;
  const sb = sbOrErr;

  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = (page - 1) * limit;

  const { data: boardRow, error: bErr } = await sb
    .from("boards")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (bErr) {
    return jsonError(bErr.message, 500);
  }
  if (!boardRow) {
    return jsonError("게시판을 찾을 수 없습니다.", 404);
  }

  const board = rowToBoard(boardRow as BoardRow);

  const { data: postRows, error: pErr, count } = await sb
    .from("posts")
    .select("*", { count: "exact" })
    .eq("board_id", board.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (pErr) {
    return jsonError(pErr.message, 500);
  }

  const posts: PostWithBoard[] = (postRows ?? []).map((r) => ({
    ...rowToPost(r as PostRow),
    board,
  }));

  return NextResponse.json({
    ok: true as const,
    board,
    posts,
    page,
    limit,
    total: count ?? posts.length,
  });
}
