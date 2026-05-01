import type { AccidentSource, NormalizedAccident, SourceQuery } from "./types";
import { features } from "@/lib/features";

/**
 * 사용자 직접 등록 어댑터.
 *
 * 다른 어댑터와 달리 fetch 가 아닌 사용자가 폼으로 입력하는 형태이지만,
 * 일관성을 위해 동일 인터페이스를 따릅니다.
 *
 * Phase 1 에서는 UI 의 AccidentForm 이 직접 Supabase 에 저장하고,
 * 이 어댑터는 통계/표시용으로 사용됩니다.
 */
export class UserSource implements AccidentSource {
  readonly type = "user";
  readonly label = "사용자 등록";
  get enabled() {
    return features.USER_REGISTRATION;
  }

  async fetch(_query: SourceQuery): Promise<NormalizedAccident[]> {
    // 사용자 등록 데이터는 DB에서 직접 조회하므로 어댑터에서 fetch 하지 않음.
    return [];
  }
}
