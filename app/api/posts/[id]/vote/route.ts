import { NextResponse } from "next/server";
import { jsonError, requireAuth, UUID_RE } from "@/lib/api/http";
import {
  rowToPostVote,
  syncPostVoteCounts,
  type PostVoteRow,
} from "@/lib/supabase/community";

interface VoteBody {
  value?: number;
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

  let body: VoteBody;
  try {
    body = (await req.json()) as VoteBody;
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const value = body.value;
  if (value !== 1 && value !== -1) {
    return jsonError("value는 1 또는 -1 이어야 합니다.", 400);
  }

  const { sb, userId } = auth;

  const { data, error } = await sb
    .from("post_votes")
    .upsert(
      {
        post_id: postId,
        user_id: userId,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "post_id,user_id" }
    )
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  try {
    await syncPostVoteCounts(postId);
  } catch {
    /* 서비스 롤 없으면 집계 스킵 */
  }

  return NextResponse.json({
    ok: true as const,
    vote: rowToPostVote(data as PostVoteRow),
  });
}
