import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth (카카오/구글/이메일 magic link 등) 공통 콜백.
 *
 * Supabase Auth Provider 설정의 Redirect URL 은 다음 두 가지를 등록:
 *   1. 카카오 디벨로퍼스: https://<project>.supabase.co/auth/v1/callback (Supabase 측 콜백)
 *   2. 이 라우트:        https://<our-domain>/auth/callback           (앱 측 콜백)
 *
 * Supabase 가 우리 도메인의 /auth/callback 으로 ?code=... 를 붙여 redirect 하면,
 * 여기서 PKCE 교환을 통해 세션 쿠키를 심고, 원래 머무르던 페이지(next 파라미터)로 보낸다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // 실패 시 에러 페이지로
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/error?message=missing_code`
  );
}
