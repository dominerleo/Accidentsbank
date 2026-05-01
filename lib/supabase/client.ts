"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let browserClient: SupabaseClient | null = null;

/**
 * 브라우저(클라이언트 컴포넌트) 전용 Supabase 클라이언트.
 *
 * - 동일 페이지 내에서는 싱글톤으로 재사용 (세션/실시간 구독 안정성).
 * - SSR 쿠키 기반 세션을 자동으로 동기화.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. .env.local 을 확인하세요."
    );
  }
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
