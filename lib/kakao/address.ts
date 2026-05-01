import type {
  AccidentAddress,
  KakaoCoord2AddressResponse,
  LatLng,
} from "@/types";
import { KAKAO_REST_API_KEY } from "./config";

export async function reverseGeocode(
  { lat, lng }: LatLng
): Promise<AccidentAddress | null> {
  if (!KAKAO_REST_API_KEY) {
    console.warn("[kakao] KAKAO_REST_API_KEY is not configured");
    return null;
  }

  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("[kakao] reverseGeocode failed", res.status);
    return null;
  }

  const data = (await res.json()) as KakaoCoord2AddressResponse;
  const doc = data.documents?.[0];
  if (!doc) return null;

  return {
    roadAddress: doc.road_address?.address_name,
    jibunAddress: doc.address?.address_name,
    region1: doc.address?.region_1depth_name ?? doc.road_address?.region_1depth_name,
    region2: doc.address?.region_2depth_name ?? doc.road_address?.region_2depth_name,
    region3: doc.address?.region_3depth_name ?? doc.road_address?.region_3depth_name,
  };
}
