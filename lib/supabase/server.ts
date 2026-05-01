import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Route Handler / Server Component 전용 Supabase 클라이언트.
 *
 * - Next.js cookies() 기반으로 사용자 세션을 읽고/쓴다.
 * - RLS 정책이 user JWT 기준으로 평가된다.
 * - service role 이 필요한 admin 작업은 lib/supabase/admin 을 사용할 것.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. .env.local 을 확인하세요."
    );
  }
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 에서 호출되면 set 이 막혀있을 수 있음.
          // middleware 가 세션을 갱신하므로 무시해도 안전.
        }
      },
    },
  });
}
