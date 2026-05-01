import type { AccidentSource, NormalizedAccident, SourceQuery } from "./types";

/**
 * TAAS (도로교통공단 교통사고분석시스템) 어댑터.
 *
 * Phase 1 마지막 단계에서 구현 예정.
 * 공공데이터포털에서 받은 CSV 를 파싱하여 NormalizedAccident 배열로 변환합니다.
 */
export class TaasSource implements AccidentSource {
  readonly type = "official";
  readonly label = "공식 통계 (TAAS)";
  readonly enabled = true;

  async fetch(_query: SourceQuery): Promise<NormalizedAccident[]> {
    // TODO(Phase 1.4): scripts/import-taas.ts 에서 사용할 파서 구현
    return [];
  }
}
