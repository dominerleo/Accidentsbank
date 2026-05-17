import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Next.js middleware — Supabase 세션(쿠키) 갱신.
 *
 * - `getUser()`는 요청마다 Auth 서버 `/user`를 호출해 부하·타임아웃·동시 탭 리프레시 경쟁 시 불안정해질 수 있음.
 * - `getClaims()`는 가능한 경우 로컬 JWT 검증으로 끝나며, 만료 시 기존과 같이 쿠키 갱신(setAll)이 이어짐.
 * - `NextResponse.next({ request })`로 요청 객체를 그대로 넘겨 RSC/프리패치와 헤더 불일치를 줄임.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/ingest") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next({ request });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set({ name, value, ...options })
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          } catch (cookieErr) {
            console.error("[middleware] cookie setAll failed:", cookieErr);
          }
        },
      },
    });

    const { error } = await supabase.auth.getClaims();
    if (error && process.env.NODE_ENV === "development") {
      console.warn("[middleware] getClaims:", error.message);
    }
  } catch (err) {
    console.error("[middleware] Supabase session refresh failed:", err);
    response = NextResponse.next({ request });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|favicon\\.ico|api/|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot|txt|xml|json|map|webmanifest)$).*)",
  ],
};
