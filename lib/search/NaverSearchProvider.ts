import type { SearchProvider, SearchQuery, SearchResult } from "./types";
import type { NaverNewsApiItem, NaverNewsApiResponse } from "./naverNews";
import {
  naverNewsExternalId,
  naverNewsItemUrl,
  stripNaverHtml,
} from "./naverNews";

/**
 * 네이버 뉴스 검색 API Provider.
 *
 * https://developers.naver.com/docs/serviceapi/search/news/news.md
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

  async search(query: SearchQuery): Promise<SearchResult[]> {
    if (!this.clientId || !this.clientSecret) {
      return [];
    }

    const display = Math.min(Math.max(query.limit ?? 10, 1), 100);
    const url = new URL("https://openapi.naver.com/v1/search/news.json");
    url.searchParams.set("query", query.keyword);
    url.searchParams.set("display", String(display));
    url.searchParams.set("start", "1");
    url.searchParams.set("sort", "date");

    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": this.clientId,
        "X-Naver-Client-Secret": this.clientSecret,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[naver] news search failed", res.status, body.slice(0, 200));
      return [];
    }

    const data = (await res.json()) as NaverNewsApiResponse;
    let items: NaverNewsApiItem[] = data.items ?? [];

    const fromMs = query.from ? new Date(query.from).getTime() : null;
    const toMs = query.to ? new Date(query.to).getTime() : null;

    if (fromMs !== null || toMs !== null) {
      items = items.filter((item) => {
        const t = new Date(item.pubDate).getTime();
        if (Number.isNaN(t)) return true;
        if (fromMs !== null && t < fromMs) return false;
        if (toMs !== null && t > toMs) return false;
        return true;
      });
    }

    return items.map((item) => ({
      title: stripNaverHtml(item.title),
      description: stripNaverHtml(item.description),
      url: naverNewsItemUrl(item),
      publishedAt: (() => {
        const d = new Date(item.pubDate);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      })(),
      source: "naver-news",
      thumbnailUrl: undefined,
      externalId: naverNewsExternalId(item),
    }));
  }
}
