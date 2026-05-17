import { NextResponse } from "next/server";
import { getOptionalSupabase } from "@/lib/api/http";
import {
  rowToAccident,
  type AccidentRow,
} from "@/lib/supabase/accident";
import { rowToPost, type PostRow } from "@/lib/supabase/community";
import {
  koreaDayEndIso,
  koreaDayStartIso,
  seoulTodayYmd,
} from "@/lib/dateRange";
import type { Accident } from "@/types";
import type { Post } from "@/types/community";

export async function GET() {
  const sbOrErr = await getOptionalSupabase();
  if (sbOrErr instanceof NextResponse) return sbOrErr;
  const sb = sbOrErr;

  const todayYmd = seoulTodayYmd();
  const from = koreaDayStartIso(todayYmd);
  const to = koreaDayEndIso(todayYmd);

  let latestReports: Post[] = [];
  let popularPosts: Post[] = [];
  let todayAccidents: Accident[] = [];

  try {
    const { data: boardRow } = await sb
      .from("boards")
      .select("id")
      .eq("slug", "accident-report")
      .maybeSingle();

    if (boardRow?.id) {
      const { data: rows } = await sb
        .from("posts")
        .select("*")
        .eq("board_id", boardRow.id as string)
        .eq("status", "published")
        .eq("is_blinded", false)
        .order("created_at", { ascending: false })
        .limit(5);
      latestReports = (rows ?? []).map((r) => rowToPost(r as PostRow));
    }
  } catch {
    latestReports = [];
  }

  try {
    const { data: rows } = await sb
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("is_blinded", false)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    popularPosts = (rows ?? []).map((r) => rowToPost(r as PostRow));
  } catch {
    popularPosts = [];
  }

  try {
    const { data: rows } = await sb
      .from("accidents")
      .select("*")
      .gte("occurred_at", from)
      .lte("occurred_at", to)
      .order("occurred_at", { ascending: false })
      .limit(12);

    const visible = (rows ?? []).filter(
      (r) =>
        typeof r.title === "string" &&
        !r.title.toLowerCase().includes("테스트")
    );
    todayAccidents = visible.slice(0, 5).map((r) => rowToAccident(r as AccidentRow));
  } catch {
    todayAccidents = [];
  }

  return NextResponse.json({
    ok: true as const,
    latestReports,
    popularPosts,
    todayAccidents,
  });
}
