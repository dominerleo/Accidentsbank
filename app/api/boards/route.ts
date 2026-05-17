import { NextResponse } from "next/server";
import { jsonError, getOptionalSupabase } from "@/lib/api/http";
import { rowToBoard, type BoardRow } from "@/lib/supabase/community";

export async function GET() {
  const sbOrErr = await getOptionalSupabase();
  if (sbOrErr instanceof NextResponse) return sbOrErr;

  const { data, error } = await sbOrErr
    .from("boards")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return jsonError(error.message, 500);
  }

  const boards = (data ?? []).map((r) => rowToBoard(r as BoardRow));
  return NextResponse.json({ ok: true as const, boards });
}
