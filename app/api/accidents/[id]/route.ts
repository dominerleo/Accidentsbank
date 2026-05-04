import { NextResponse } from "next/server";
import type { AccidentCategory, AccidentPatch } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  patchToAccidentRow,
  rowToAccident,
  type AccidentRow,
} from "@/lib/supabase/accident";

const CATEGORIES: AccidentCategory[] = [
  "incident",
  "crime",
  "news",
  "etc",
  "misc",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/accidents/:id
 *
 * - admin / moderator: 모든 필드 수정 (sourceType 포함).
 * - 일반 사용자: 본인 작성(created_by = auth.uid())만 수정, sourceType 변경 불가.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  let patch: AccidentPatch;
  try {
    patch = (await req.json()) as AccidentPatch;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (patch.category !== undefined && !CATEGORIES.includes(patch.category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (patch.title !== undefined && !String(patch.title).trim()) {
    return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  }
  if (patch.location !== undefined) {
    const { lat, lng } = patch.location;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "location.lat / location.lng must be finite" },
        { status: 400 }
      );
    }
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
  const isStaff = role === "admin" || role === "moderator";

  const row = patchToAccidentRow(patch, { allowSourceType: isStaff });
  if (Object.keys(row).length === 0) {
    return NextResponse.json(
      { error: "수정할 필드가 없습니다." },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from("accidents")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST116" || error.message.includes("0 rows")) {
      return NextResponse.json(
        { error: "수정할 수 없거나 해당 기록이 없습니다." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(rowToAccident(data as AccidentRow));
}

/**
 * DELETE /api/accidents/:id
 *
 * - 프로필 role 이 admin / moderator 이면 service role 로 삭제 (created_by NULL 포함).
 * - 일반 사용자는 RLS 에 따라 본인 작성만 삭제 (user JWT).
 * - `ADMIN_DELETE_SECRET` 이 설정된 경우, 요청 헤더 `x-admin-delete-secret` 이 일치하면
 *   로그인 없이도 삭제 가능 (로컬 테스트 전용). 프로덕션에서는 비워 둘 것.
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const headerSecret = req.headers.get("x-admin-delete-secret") ?? "";
  const envSecret = process.env.ADMIN_DELETE_SECRET ?? "";

  if (envSecret && headerSecret === envSecret) {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("accidents")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
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
    return NextResponse.json(
      {
        error:
          "로그인이 필요합니다. 테스트 데이터 삭제는 .env.local 의 ADMIN_DELETE_SECRET 과 헤더를 맞추거나, Supabase SQL 로 삭제하세요.",
      },
      { status: 401 }
    );
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
  if (role === "admin" || role === "moderator") {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("accidents")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await sb
    .from("accidents")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json(
      { error: "삭제할 수 없거나 해당 기록이 없습니다." },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
