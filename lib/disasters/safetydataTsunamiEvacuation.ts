/**
 * 행정안전부 NDMS — "지진해일 대피지구 위치 정보" (safetydata.go.kr, dataSn=1340) fetcher.
 *
 * 데이터 출처 페이지: https://www.safetydata.go.kr/disaster-data/view?dataSn=1340
 *
 * 응답 형식이 endpoint 마다 살짝 달라 candidate 필드 다중 매칭 방식으로 정규화한다.
 * 기존 정부24(`gov24SexOffenderAddress.ts`) 모듈의 패턴을 따름.
 *
 * 환경 변수:
 *   - SAFETYDATA_API_KEY                : safetydata.go.kr 일반 인증키 (필수)
 *   - SAFETYDATA_TSUNAMI_API_URL        : 부여받은 OpenAPI 엔드포인트 전체 URL (선택)
 *                                         미지정 시 기본 추정 URL 사용. 배포 전 검증 필요.
 *
 * 보안: API 키는 응답·로그·에러 메시지에 절대 노출하지 않는다.
 */

const DEFAULT_TSUNAMI_API_URL =
  "https://www.safetydata.go.kr/V2/api/DSSP-IF-10164";

const REQUEST_TIMEOUT_MS = 15_000;

export interface FetchTsunamiEvacRawArgs {
  serviceKey: string;
  pageNo: number;
  numOfRows: number;
}

export interface RawTsunamiResponse {
  json: unknown;
  status: number;
}

/**
 * safetydata.go.kr OpenAPI 호출 → JSON.
 *
 * 일반적으로 응답 헤더 구조:
 *   {
 *     header: { resultCode: '00' | '0', resultMsg: 'NORMAL_SERVICE' },
 *     body:   { items: [...], totalCount, pageNo, numOfRows }
 *   }
 * 또는 변형:
 *   { response: { header: {...}, body: {...} } }
 */
export async function fetchTsunamiEvacuationRaw(
  args: FetchTsunamiEvacRawArgs
): Promise<RawTsunamiResponse> {
  const { serviceKey, pageNo, numOfRows } = args;
  const base =
    process.env.SAFETYDATA_TSUNAMI_API_URL?.trim() || DEFAULT_TSUNAMI_API_URL;

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
  // safetydata.go.kr 일부 endpoint 는 파라미터 오류 시 XML 을 돌려준다.
  // JSON 으로 파싱 시도해서 실패하면 상위에서 502 처리.
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("upstream_not_json");
  }
  return { json, status: res.status };
}

interface ParsedTsunamiResponse {
  headerResultCode: string | null;
  headerResultMsg: string | null;
  totalCount: number;
  items: unknown[];
}

function pickString(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/**
 * 응답 root 에서 header / body / items 를 안전하게 추출.
 * `response.header.resultCode` / `header.resultCode` / `resultCode` 모두 대응.
 */
export function parseTsunamiResponse(json: unknown): ParsedTsunamiResponse {
  if (!json || typeof json !== "object") {
    return {
      headerResultCode: null,
      headerResultMsg: null,
      totalCount: 0,
      items: [],
    };
  }
  const root = json as Record<string, unknown>;

  // 1) "response" 한 번 감싸진 형태
  const inner =
    (root.response as Record<string, unknown> | undefined) ?? root;

  const header =
    (inner.header as Record<string, unknown> | undefined) ?? undefined;
  const body =
    (inner.body as Record<string, unknown> | undefined) ?? inner;

  const headerResultCode =
    pickString(header ?? {}, "resultCode", "RESULT_CODE", "errorCode") ??
    pickString(root, "resultCode", "RESULT_CODE", "errorCode");
  const headerResultMsg =
    pickString(header ?? {}, "resultMsg", "RESULT_MSG", "errorMsg") ??
    pickString(root, "resultMsg", "RESULT_MSG", "errorMsg");

  let items: unknown[] = [];
  const rawItems = (body as Record<string, unknown>)?.items;
  if (Array.isArray(rawItems)) {
    items = rawItems;
  } else if (
    rawItems &&
    typeof rawItems === "object" &&
    Array.isArray((rawItems as Record<string, unknown>).item)
  ) {
    items = (rawItems as { item: unknown[] }).item;
  } else if (Array.isArray((body as Record<string, unknown>)?.item)) {
    items = (body as { item: unknown[] }).item;
  } else if (Array.isArray((root as Record<string, unknown>)?.body)) {
    items = (root as { body: unknown[] }).body;
  }

  let totalCount = 0;
  const tcRaw =
    (body as Record<string, unknown>)?.totalCount ??
    (body as Record<string, unknown>)?.TOTAL_COUNT ??
    (root as Record<string, unknown>)?.totalCount;
  if (typeof tcRaw === "number" && Number.isFinite(tcRaw)) {
    totalCount = tcRaw;
  } else if (typeof tcRaw === "string") {
    const n = Number(tcRaw);
    if (Number.isFinite(n)) totalCount = n;
  }

  return {
    headerResultCode,
    headerResultMsg,
    totalCount,
    items,
  };
}

export interface NormalizedTsunamiEvacuationItem {
  /** 안정적 ID — source 의 키가 있으면 그대로, 없으면 페이지+인덱스+주소 hash. */
  id: string;
  sourceType: string;
  sourceName: string;
  /** 표시용 명칭(대피지구명·시설명). 개인정보 아님. */
  name: string | null;
  /** 표시용 주소. */
  displayAddress: string;
  /** 지오코딩 fallback 용 입력 주소(좌표 못 받았을 때만 사용). */
  addressForGeocoding: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  /** 응답에 좌표가 직접 들어 있다면 우선 사용 (지진해일 대피지구 데이터엔 보통 포함됨). */
  latitude: number | null;
  longitude: number | null;
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
 * 지진해일 대피지구 응답 1건 → 정규화 모델.
 * NDMS 표준 필드명이 endpoint 마다 약간씩 달라 후보 키들을 모두 시도한다.
 */
export function normalizeTsunamiEvacuationItem(
  raw: unknown,
  pageNo: number,
  index: number
): NormalizedTsunamiEvacuationItem {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const sourceKey =
    pickString(o, "MNG_NO", "mngNo", "id", "ID", "ROW_NUMBER", "rownum") ??
    `tsunami:${pageNo}:${index}`;

  const name = pickString(
    o,
    "BCNT_NM",
    "bcntNm",
    "EVCT_NM",
    "evctNm",
    "FACILITY_NM",
    "facilityNm",
    "EQK_TS_EVCT_DSTR_NM",
    "name",
    "NAME"
  );

  const sido = pickString(o, "SIDO_NM", "sidoNm", "ctprvnNm", "CTPRVN_NM");
  const sigungu = pickString(
    o,
    "SIGNGU_NM",
    "signguNm",
    "SGG_NM",
    "sggNm"
  );
  const eupmyeondong = pickString(
    o,
    "EMD_NM",
    "emdNm",
    "EUPMYEONDONG_NM"
  );
  const ri = pickString(o, "LI_NM", "liNm");

  const roadAddress = pickString(
    o,
    "RDNMADR_NM",
    "rdnmadrNm",
    "ROAD_ADDR",
    "roadAddr",
    "ROAD_NM_ADDR"
  );
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
  const addressForGeocoding = jibunAddress ?? roadAddress ?? fallbackAddress ?? displayAddress;

  const latitude =
    parseNumberOrNull(o.LATITUDE) ??
    parseNumberOrNull(o.latitude) ??
    parseNumberOrNull(o.LAT) ??
    parseNumberOrNull(o.lat) ??
    parseNumberOrNull(o.YCRD) ??
    parseNumberOrNull(o.ycrd) ??
    parseNumberOrNull(o.GRS80_LAT) ??
    null;

  const longitude =
    parseNumberOrNull(o.LONGITUDE) ??
    parseNumberOrNull(o.longitude) ??
    parseNumberOrNull(o.LON) ??
    parseNumberOrNull(o.lon) ??
    parseNumberOrNull(o.LNG) ??
    parseNumberOrNull(o.lng) ??
    parseNumberOrNull(o.XCRD) ??
    parseNumberOrNull(o.xcrd) ??
    parseNumberOrNull(o.GRS80_LON) ??
    null;

  return {
    id: sourceKey,
    sourceType: "safetydata_tsunami_evacuation",
    sourceName: "행정안전부 NDMS 지진해일 대피지구",
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
