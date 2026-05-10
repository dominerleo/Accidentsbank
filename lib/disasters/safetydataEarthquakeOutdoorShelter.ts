/**
 * 행정안전부 NDMS — 지진 옥외대피소 포인트 (safetydata.go.kr DSSP-IF-00103).
 *
 * 환경 변수:
 *   - SAFETYDATA_API_KEY                      : safetydata.go.kr 서비스키 (필수)
 *   - SAFETYDATA_EARTHQUAKE_SHELTER_API_URL   : 엔드포인트 전체 URL (선택)
 *       기본: https://www.safetydata.go.kr/V2/api/DSSP-IF-00103
 *
 * 좌표: 응답에 WGS84 위경도가 있으면(한반도 범위)만 사용한다.
 * XMAP_CRTS/YMAP_CRTS 등 투영좌표는 잘못 위경도로 해석되면 지도가 깨지므로 여기서는 무시하고
 * 주소 문자열로 카카오 지오코딩한다.
 */

import {
  parseTsunamiResponse,
  type NormalizedTsunamiEvacuationItem,
} from "@/lib/disasters/safetydataTsunamiEvacuation";

export { parseTsunamiResponse };

const DEFAULT_API_URL =
  "https://www.safetydata.go.kr/V2/api/DSSP-IF-00103";

const REQUEST_TIMEOUT_MS = 15_000;

/** 한반도 근처 WGS84 만 허용 (오좌표 방지). */
function isPlausibleKoreaWgs84(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132;
}

export interface FetchEarthquakeShelterRawArgs {
  serviceKey: string;
  pageNo: number;
  numOfRows: number;
}

export interface RawEarthquakeShelterResponse {
  json: unknown;
  status: number;
}

export async function fetchEarthquakeOutdoorShelterRaw(
  args: FetchEarthquakeShelterRawArgs
): Promise<RawEarthquakeShelterResponse> {
  const { serviceKey, pageNo, numOfRows } = args;
  const base =
    process.env.SAFETYDATA_EARTHQUAKE_SHELTER_API_URL?.trim() ||
    DEFAULT_API_URL;

  const url = new URL(base);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("returnType", "json");
  url.searchParams.set("type", "json");

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: ctrl.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(tid);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("upstream_not_json");
  }
  return { json, status: res.status };
}

function pickString(
  o: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function parseNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * NDMS 지진 옥외대피소 1건 → NormalizedTsunamiEvacuationItem 형태 (동일 캐시 파이프 재사용).
 */
export function normalizeEarthquakeOutdoorShelterItem(
  raw: unknown,
  pageNo: number,
  index: number
): NormalizedTsunamiEvacuationItem {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const sourceKey =
    pickString(
      o,
      "THINGS_MNG_NO",
      "thingsMngNo",
      "OBJT_ID",
      "objtId",
      "MNG_NO",
      "mngNo",
      "id",
      "ID"
    ) ?? `eq_shelter:${pageNo}:${index}`;

  const name = pickString(
    o,
    "THINGS_NM",
    "thingsNm",
    "BCNT_NM",
    "bcntNm",
    "FACILITY_NM",
    "facilityNm",
    "name",
    "NAME"
  );

  const sido = pickString(o, "CTPV_NM", "ctpvNm", "SIDO_NM", "sidoNm");
  const sigungu = pickString(o, "SGG_NM", "sggNm", "SIGNGU_NM", "signguNm");
  const eupmyeondong = pickString(o, "EMD_NM", "emdNm", "EUPMYEONDONG_NM");
  const ri = pickString(o, "LI_NM", "liNm");

  const roadName = pickString(o, "ROAD_NM", "roadNm", "RDNMADR_NM", "rdnmadrNm");
  const addrMno = pickString(o, "ADDR_MNO", "addrMno", "MNO", "mno");
  const addrSno = pickString(o, "ADDR_SNO", "addrSno", "SNO", "sno");
  const roadLine = [roadName, addrMno, addrSno]
    .map((s) => (s ?? "").trim())
    .filter((s) => s && s !== "0")
    .join(" ");

  const roadAddress =
    roadLine ||
    pickString(o, "RDNMADR_NM", "rdnmadrNm", "ROAD_ADDR", "roadAddr");
  const jibunAddress = pickString(
    o,
    "LNM_ADRES",
    "lnmAdres",
    "JIBUN_ADDR",
    "jibunAddr"
  );
  const fallbackAddress =
    [sido, sigungu, eupmyeondong, ri].filter((s) => s && s.trim()).join(" ") ||
    null;

  const displayAddress =
    roadAddress ?? jibunAddress ?? fallbackAddress ?? "(주소 요약 없음)";
  const addressForGeocoding =
    [sido, sigungu, eupmyeondong, roadLine || roadName, addrMno, addrSno]
      .filter((s) => s && String(s).trim())
      .join(" ")
      .trim() ||
    jibunAddress ||
    roadAddress ||
    fallbackAddress ||
    displayAddress;

  let latitude: number | null =
    parseNumberOrNull(o.LATITUDE) ??
    parseNumberOrNull(o.latitude) ??
    parseNumberOrNull(o.WGS84_LAT) ??
    parseNumberOrNull(o.wgs84Lat) ??
    parseNumberOrNull(o.LAT) ??
    parseNumberOrNull(o.lat);

  let longitude: number | null =
    parseNumberOrNull(o.LONGITUDE) ??
    parseNumberOrNull(o.longitude) ??
    parseNumberOrNull(o.WGS84_LON) ??
    parseNumberOrNull(o.wgs84Lon) ??
    parseNumberOrNull(o.LON) ??
    parseNumberOrNull(o.lon) ??
    parseNumberOrNull(o.LNG) ??
    parseNumberOrNull(o.lng);

  if (
    latitude == null ||
    longitude == null ||
    !isPlausibleKoreaWgs84(latitude, longitude)
  ) {
    latitude = null;
    longitude = null;
  }

  return {
    id: sourceKey,
    sourceType: "safetydata_earthquake_outdoor_shelter",
    sourceName: "행정안전부 NDMS 지진 옥외대피소",
    name,
    displayAddress,
    addressForGeocoding,
    sido,
    sigungu,
    eupmyeondong,
    ri,
    latitude,
    longitude,
  };
}
