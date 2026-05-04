import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 관리자 권한 체크. 두 단계로 평가한다.
 *
 * 1) Supabase 세션이 있고 `profiles.role IN ('admin','moderator')` 이면 통과.
 * 2) 그렇지 않더라도 ADMIN_EMAILS(쉼표 구분)에 사용자 이메일이 포함되면 통과.
 *
 * 둘 다 실패하면 reason 과 함께 { ok: false } 를 반환한다.
 */
export type AdminAuthResult =
  | {
      ok: true;
      userId: string | null;
      email: string | null;
      via: "profiles_role" | "admin_emails";
    }
  | {
      ok: false;
      status: 401 | 403 | 500;
      reason: string;
    };

export async function checkAdminAuth(): Promise<AdminAuthResult> {
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch {
    return {
      ok: false,
      status: 500,
      reason: "supabase_env_missing",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // ADMIN_EMAILS 만으로 임시 통과시키고 싶을 때를 대비해 user 가 없어도 일단 진행.
  if (userError && process.env.NODE_ENV === "development") {
    console.warn("[admin] supabase.auth.getUser:", userError.message);
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (user) {
    // 1) profiles.role 우선
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = (profile?.role as string | undefined) ?? "user";
      if (role === "admin" || role === "moderator") {
        return {
          ok: true,
          userId: user.id,
          email: user.email ?? null,
          via: "profiles_role",
        };
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[admin] profiles lookup failed:", err);
      }
    }

    // 2) ADMIN_EMAILS 폴백
    if (
      adminEmails.length > 0 &&
      user.email &&
      adminEmails.includes(user.email.toLowerCase())
    ) {
      return {
        ok: true,
        userId: user.id,
        email: user.email,
        via: "admin_emails",
      };
    }

    return {
      ok: false,
      status: 403,
      reason: "not_admin",
    };
  }

  return {
    ok: false,
    status: 401,
    reason: "auth_required",
  };
}
