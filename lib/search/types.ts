/**
 * 검색 Provider 추상화.
 *
 * 네이버 / Tavily / Daum 등 검색 엔진을 교체 가능하도록 인터페이스 분리.
 * Phase 2 에서 NaverSearchProvider 구현 예정.
 */

export interface SearchQuery {
  keyword: string;
  /** 발행일 시작 (ISO date) */
  from?: string;
  /** 발행일 끝 (ISO date) */
  to?: string;
  /** 결과 수 */
  limit?: number;
}

export interface SearchResult {
  title: string;
  description: string;
  url: string;
  publishedAt?: string;
  source?: string;
  thumbnailUrl?: string;
  /** 배치 upsert 용 고유 키 (없으면 url 사용) */
  externalId?: string;
}

export interface SearchProvider {
  readonly type: string;
  readonly label: string;
  search(query: SearchQuery): Promise<SearchResult[]>;
}
