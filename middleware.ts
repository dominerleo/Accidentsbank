import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Next.js middleware - 매 요청마다 Supabase 세션을 갱신한다.
 *
 * @supabase/ssr 의 권장 패턴: getUser() 호출이 만료된 토큰을 자동으로 새로고침하고
 * 응답 쿠키에 갱신된 세션을 심어준다.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // 환경변수 미설정 시 미들웨어는 noop.
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 토큰 새로고침 트리거 (반환값 자체는 사용 안 함).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * 정적 자산은 제외:
     * - _next/static, _next/image, favicon.ico
     * - 이미지/폰트 파일
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot)$).*)",
  ],
};
