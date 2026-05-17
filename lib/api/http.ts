import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** API 에러 응답 (본문 JSON 통일) */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { ok: false as const, error: message, ...extra },
    { status }
  );
}

export async function getOptionalSupabase(): Promise<
  SupabaseClient | NextResponse
> {
  try {
    return await getSupabaseServerClient();
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
}

export type AuthOk = { ok: true; sb: SupabaseClient; userId: string };
export type AuthResult = AuthOk | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const sbOrErr = await getOptionalSupabase();
  if (sbOrErr instanceof NextResponse) {
    return { ok: false, response: sbOrErr };
  }
  const sb = sbOrErr;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { ok: false, response: jsonError("로그인이 필요합니다.", 401) };
  }
  return { ok: true, sb, userId: user.id };
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getUserRole(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await sb
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as string | undefined) ?? null;
}

export function isStaffRole(role: string | null): boolean {
  return role === "admin" || role === "moderator";
}
