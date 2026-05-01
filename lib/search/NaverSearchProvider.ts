import type { SearchProvider, SearchQuery, SearchResult } from "./types";

/**
 * 네이버 뉴스 검색 API Provider (Phase 2).
 *
 * https://developers.naver.com/docs/serviceapi/search/news/news.md
 * 무료 한도: 25,000 회/월.
 */
export class NaverSearchProvider implements SearchProvider {
  readonly type = "naver";
  readonly label = "네이버 뉴스";

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId?: string, clientSecret?: string) {
    this.clientId = clientId ?? process.env.NAVER_CLIENT_ID ?? "";
    this.clientSecret =
      clientSecret ?? process.env.NAVER_CLIENT_SECRET ?? "";
  }

  async search(_query: SearchQuery): Promise<SearchResult[]> {
    if (!this.clientId || !this.clientSecret) {
      return [];
    }
    // TODO(Phase 2.5): 네이버 뉴스 API 호출 + 응답 매핑
    return [];
  }
}
