import { reverseGeocode } from "@/lib/kakao/address";
import { geocodeKeywordFirst } from "@/lib/kakao/geocodeKeyword";
import { getSearchProvider } from "@/lib/search";
import type { AccidentCategory } from "@/types";
import { features } from "@/lib/features";
import type { AccidentSource, NormalizedAccident, SourceQuery } from "./types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 뉴스 검색 → 지오코딩 → NormalizedAccident.
 * 카카오 키워드 검색·역지오코딩에 REST 키가 필요합니다.
 */
export class NewsSource implements AccidentSource {
  readonly type = "news";
  readonly label = "뉴스 기사";

  get enabled() {
    return features.NEWS_SEARCH || process.env.IMPORT_FORCE_NEWS === "1";
  }

  async fetch(query: SourceQuery): Promise<NormalizedAccident[]> {
    if (!this.enabled) return [];

    const keyword = (query.keyword ?? "").trim();
    if (!keyword) return [];

    const provider = getSearchProvider();
    const fromIso =
      query.fromYear !== undefined
        ? `${query.fromYear}-01-01`
        : undefined;
    const toIso =
      query.toYear !== undefined ? `${query.toYear}-12-31` : undefined;

    const raw = await provider.search({
      keyword,
      from: fromIso,
      to: toIso,
      limit: Math.min(query.limit ?? 15, 100),
    });

    const out: NormalizedAccident[] = [];

    for (const item of raw) {
      const geoQuery = [query.region, item.title]
        .filter(Boolean)
        .join(" ")
        .trim()
        .slice(0, 100);
      const geo =
        (await geocodeKeywordFirst(geoQuery || item.title)) ??
        (query.center
          ? { lat: query.center.lat, lng: query.center.lng, label: "center" }
          : null);
      if (!geo) continue;

      await sleep(120);
      const address =
        (await reverseGeocode({ lat: geo.lat, lng: geo.lng })) ?? {};

      const occurredAt =
        item.publishedAt && !Number.isNaN(new Date(item.publishedAt).getTime())
          ? new Date(item.publishedAt).toISOString()
          : new Date().toISOString();

      const externalId =
        item.externalId ?? item.url ?? `naver:${item.title}:${occurredAt}`;

      const confidence =
        query.region && query.region.length > 1
          ? 0.55
          : query.center
            ? 0.45
            : 0.35;

      const category: AccidentCategory = "news";

      out.push({
        category,
        title: item.title.slice(0, 500),
        description: item.description?.slice(0, 4000),
        occurredAt,
        location: { lat: geo.lat, lng: geo.lng },
        address,
        newsUrl: item.url || undefined,
        sourceType: "news",
        metadata: {
          external_id: externalId.slice(0, 2000),
          geocode_label: geo.label,
          search_keyword: keyword,
          news_provider: provider.type,
        },
        confidence,
        tags: ["news-import"],
      });
    }

    return out;
  }
}
