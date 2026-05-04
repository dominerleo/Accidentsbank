import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/accidents/purge
 * Body: { "confirm": true }
 * admin / moderator 만 전체 삭제.
 */
export async function POST(req: Request) {
  let body: { confirm?: boolean };
  try {
    body = (await req.json()) as { confirm?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body?.confirm) {
    return NextResponse.json(
      { error: 'confirm 가 true 여야 합니다. { "confirm": true }' },
      { status: 400 }
    );
  }

  let sb;
  try {
    sb = await getSupabaseServerClient();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const role = profile?.role as string | undefined;
  if (role !== "admin" && role !== "moderator") {
    return NextResponse.json({ error: "관리자만 전체 삭제할 수 있습니다." }, {
      status: 403,
    });
  }

  const admin = getSupabaseAdminClient();
  const { error, count } = await admin
    .from("accidents")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
