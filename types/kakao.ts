export interface KakaoKeywordSearchMeta {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
}

/** 키워드 장소 검색 문서 (요약 필드) */
export interface KakaoKeywordPlaceDocument {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url?: string;
  distance?: string;
}

export interface KakaoKeywordSearchResponse {
  meta: KakaoKeywordSearchMeta;
  documents: KakaoKeywordPlaceDocument[];
}

/** 앱에서 쓰는 정규화된 장소 (API 응답) */
export interface PlaceSearchResultItem {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
}

export interface KakaoCoord2AddressResponse {
  meta: { total_count: number };
  documents: KakaoAddressDocument[];
}

export interface KakaoAddressDocument {
  road_address: KakaoRoadAddress | null;
  address: KakaoJibunAddress | null;
}

export interface KakaoRoadAddress {
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  road_name: string;
  underground_yn: "Y" | "N";
  main_building_no: string;
  sub_building_no: string;
  building_name: string;
  zone_no: string;
}

export interface KakaoJibunAddress {
  address_name: string;
  region_1depth_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
  mountain_yn: "Y" | "N";
  main_address_no: string;
  sub_address_no: string;
}
