import type { AccidentSource, NormalizedAccident, SourceQuery } from "./types";
import { features } from "@/lib/features";

/**
 * 뉴스 검색 어댑터 (Phase 2).
 *
 * 내부적으로 SearchProvider (네이버/Tavily/Daum) 를 사용하여
 * 키워드 + 영역 + 연도 기반으로 뉴스를 수집합니다.
 *
 * AI_ENABLED=true 이면 AIProvider 로 좌표/카테고리 추출까지 자동 수행.
 */
export class NewsSource implements AccidentSource {
  readonly type = "news";
  readonly label = "뉴스 기사";
  get enabled() {
    return features.NEWS_SEARCH;
  }

  async fetch(_query: SourceQuery): Promise<NormalizedAccident[]> {
    // TODO(Phase 2): SearchProvider 호출 → 결과를 NormalizedAccident 로 변환
    return [];
  }
}
