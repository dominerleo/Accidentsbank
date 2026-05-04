import type { KakaoKeywordSearchResponse, PlaceSearchResultItem } from "@/types";
import { KAKAO_REST_API_KEY } from "./config";

export async function searchKeywordPlaces(
  query: string,
  size = 15
): Promise<{ places: PlaceSearchResultItem[]; totalCount: number }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { places: [], totalCount: 0 };
  }
  if (!KAKAO_REST_API_KEY) {
    throw new Error(
      "KAKAO_REST_API_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요."
    );
  }

  const n = Math.min(Math.max(size, 1), 15);
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("size", String(n));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `키워드 검색 실패 (${res.status})${text ? `: ${text.slice(0, 120)}` : ""}`
    );
  }

  const data = (await res.json()) as KakaoKeywordSearchResponse;
  const places: PlaceSearchResultItem[] = (data.documents ?? [])
    .map((d, i) => ({
      id: d.id || `row-${i}`,
      name: d.place_name,
      category: d.category_name ?? "",
      address: d.address_name ?? "",
      roadAddress: d.road_address_name ?? "",
      lat: Number(d.y),
      lng: Number(d.x),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  return {
    places,
    totalCount: data.meta?.total_count ?? places.length,
  };
}
