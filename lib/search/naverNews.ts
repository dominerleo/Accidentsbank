/** 네이버 뉴스 검색 JSON 응답 (일부 필드만) */
export interface NaverNewsApiItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NaverNewsApiResponse {
  total?: number;
  start?: number;
  display?: number;
  items?: NaverNewsApiItem[];
}

export function stripNaverHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();
}

export function naverNewsItemUrl(item: NaverNewsApiItem): string {
  const o = item.originallink?.trim();
  if (o && /^https?:\/\//i.test(o)) return o;
  return item.link?.trim() ?? "";
}

export function naverNewsExternalId(item: NaverNewsApiItem): string {
  const url = naverNewsItemUrl(item);
  if (url) return url.slice(0, 2000);
  const t = stripNaverHtml(item.title);
  return `naver:${item.pubDate}:${t}`.slice(0, 500);
}
