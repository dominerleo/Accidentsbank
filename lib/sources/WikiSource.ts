import type { AccidentSource, NormalizedAccident, SourceQuery } from "./types";
import { features } from "@/lib/features";

/**
 * 위키 데이터 어댑터 (Phase 2 / 선택).
 *
 * 나무위키 사건사고 카테고리 또는 위키백과 한국어 표제어에서
 * 메이저 사건사고 정보를 수집합니다.
 */
export class WikiSource implements AccidentSource {
  readonly type = "wiki";
  readonly label = "위키";
  get enabled() {
    return features.WIKI_IMPORT;
  }

  async fetch(_query: SourceQuery): Promise<NormalizedAccident[]> {
    // TODO(Phase 2.6): 위키백과 API 또는 나무위키 정중한 크롤링
    return [];
  }
}
