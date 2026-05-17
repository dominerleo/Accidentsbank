import { NextResponse } from "next/server";
import { jsonError, requireAuth, UUID_RE } from "@/lib/api/http";
import {
  rowToPostReport,
  bumpPostReportCount,
  type PostReportRow,
} from "@/lib/supabase/community";

interface ReportBody {
  reasonCode?: string;
  detail?: string | null;
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

  let body: ReportBody;
  try {
    body = (await req.json()) as ReportBody;
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const reasonCode = body.reasonCode?.trim();
  if (!reasonCode) {
    return jsonError("reasonCode는 필수입니다.", 400);
  }

  const { sb, userId } = auth;

  const { data, error } = await sb
    .from("post_reports")
    .insert({
      post_id: postId,
      reporter_id: userId,
      reason_code: reasonCode,
      detail: body.detail?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  try {
    await bumpPostReportCount(postId);
  } catch {
    /* 서비스 롤 없으면 집계 스킵 */
  }

  return NextResponse.json(
    {
      ok: true as const,
      report: rowToPostReport(data as PostReportRow),
    },
    { status: 201 }
  );
}
