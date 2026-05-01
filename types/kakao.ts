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
