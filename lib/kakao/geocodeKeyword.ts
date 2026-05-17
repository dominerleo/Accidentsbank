import { searchKeywordPlaces } from "./keywordSearch";

/** 키워드 장소 검색 첫 결과 좌표 (뉴스 제목·지역 결합 지오코딩용) */
export async function geocodeKeywordFirst(
  query: string
): Promise<{ lat: number; lng: number; label: string } | null> {
  const q = query.trim();
  if (!q) return null;
  const { places } = await searchKeywordPlaces(q, 1);
  const p = places[0];
  if (!p) return null;
  return { lat: p.lat, lng: p.lng, label: p.name };
}
