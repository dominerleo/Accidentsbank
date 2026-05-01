import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let adminClient: SupabaseClient | null = null;

/**
 * Service Role 키를 사용하는 admin 클라이언트.
 *
 * RLS 를 우회하므로 다음 경우에만 사용:
 *   - 시스템 작업 (시드 데이터 삽입, 백그라운드 작업, 마이그레이션)
 *   - source_type != 'user' 데이터 (뉴스/AI 자동 수집 등)
 *   - 어드민 전용 API
 *
 * **절대로 클라이언트(브라우저) 코드에서 import 하지 말 것**.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Supabase 어드민 환경 변수가 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY 를 확인하세요."
    );
  }
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
