export const KAKAO_APP_KEY =
  process.env.NEXT_PUBLIC_KAKAO_APP_KEY ??
  process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ??
  "";
export const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY ?? "";

export const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 } as const;
export const DEFAULT_LEVEL = 5;

export function kakaoSdkUrl(appKey: string = KAKAO_APP_KEY): string {
  return `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services,clusterer,drawing&autoload=false`;
}
