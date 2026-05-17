import { KAKAO_REST_API_KEY } from "./config";

export interface GeocodeAddressResult {
  latitude: number;
  longitude: number;
}

/**
 * 카카오 주소검색 API를 사용하여 주소를 좌표로 변환합니다.
 * @param address 검색할 주소
 * @returns 변환 성공 시 { latitude, longitude }, 실패 시 null
 */
export async function geocodeAddress(address: string): Promise<GeocodeAddressResult | null> {
  if (!KAKAO_REST_API_KEY) {
    console.warn("[kakao] KAKAO_REST_API_KEY is not configured");
    return null;
  }

  const query = address.trim();
  if (!query) return null;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      // API 실패가 전체 장애로 이어지지 않도록 캐싱을 적절히 활용하거나 타임아웃을 설정할 수 있습니다.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`[kakao] geocodeAddress failed for "${query}" with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return null;

    return {
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
    };
  } catch (err) {
    console.error(`[kakao] geocodeAddress error for "${query}":`, err);
    return null;
  }
}

/**
 * 여러 주소를 한 번에 좌표로 변환합니다.
 * 과도한 요청을 막기 위해 동시 실행 개수(concurrency)를 제한합니다.
 */
export async function batchGeocodeAddresses(
  addresses: string[],
  concurrency = 5
): Promise<(GeocodeAddressResult | null)[]> {
  const results: (GeocodeAddressResult | null)[] = new Array(addresses.length).fill(null);

  for (let i = 0; i < addresses.length; i += concurrency) {
    const chunk = addresses.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((addr) => geocodeAddress(addr))
    );
    for (let j = 0; j < chunkResults.length; j++) {
      results[i + j] = chunkResults[j];
    }
  }

  return results;
}
