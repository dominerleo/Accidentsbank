import { createHash } from "crypto";

/** 공공데이터포털 · 성범죄자 공개 및 고지 지번 주소 정보 (V2) */
export const GOV24_SAIS_SEX_OFFENDER_ADDR_BASE =
  "https://apis.data.go.kr/1383000/sais/SexualAbuseNoticeHouseNumAddrServiceV2/getSexualAbuseNoticeHouseNumAddrListV2";

export type NormalizedSexOffenderAddressItem = {
  id: string;
  sourceType: "gov24_openapi";
  sourceName: string;
  createdDate: string | null;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  mainLotNo: string | null;
  subLotNo: string | null;
  displayAddress: string;
  /** 카카오 주소검색 API에 전달하기 위한 정규화 입력 주소 */
  addressForGeocoding: string;
};

function pickRaw(
  obj: Record<string, unknown>,
  candidates: string[]
): unknown {
  for (const c of candidates) {
    if (c in obj && obj[c] != null && String(obj[c]).trim() !== "") {
      return obj[c];
    }
  }
  const keyMap = new Map(
    Object.keys(obj).map((k) => [k.toLowerCase(), k] as const)
  );
  for (const c of candidates) {
    const orig = keyMap.get(c.toLowerCase());
    if (orig && obj[orig] != null && String(obj[orig]).trim() !== "") {
      return obj[orig];
    }
  }
  return undefined;
}

function pickStr(
  obj: Record<string, unknown>,
  candidates: string[]
): string | null {
  const v = pickRaw(obj, candidates);
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** 공공데이터 JSON item → 주소 중심 정규화. 개인정보 필드는 절대 포함하지 않는다. */
export function normalizeSexOffenderAddressItem(
  raw: Record<string, unknown>,
  pageNo: number,
  index: number
): NormalizedSexOffenderAddressItem {
  const createdDate = pickStr(raw, [
    "자료생성일자",
    "dataCrtYmd",
    "dataCrtDt",
    "crtYmd",
    "DATA_CRT_YMD",
    "dataCreateDt",
  ]);

  const sido = pickStr(raw, [
    "시도명",
    "sidoNm",
    "ctprvnNm",
    "ctpvNm",
    "CTPVN_NM",
    "sido",
  ]);

  const sigungu = pickStr(raw, [
    "시군구명",
    "signguNm",
    "signgu",
    "SIGNGU_NM",
    "sggNm",
  ]);

  const eupmyeondong = pickStr(raw, [
    "읍면동명",
    "emdNm",
    "umdNm",
    "EMD_NM",
    "eupmyonNm",
  ]);

  const ri = pickStr(raw, ["법정리명", "liNm", "legaldongLiNm", "LI_NM"]);

  const mainLotNo = pickStr(raw, [
    "본번",
    "mnnm",
    "mainLotNo",
    "bonbun",
    "MNNM",
    "mainLot",
  ]);

  const subLotNo = pickStr(raw, [
    "부번",
    "slno",
    "subLotNo",
    "bubun",
    "SLNO",
    "subLot",
  ]);

  const stdg = pickStr(raw, [
    "법정동코드",
    "stdgCd",
    "ldongCd",
    "bdongCd",
    "legaldongCd",
    "STDG_CD",
  ]);

  const basis = [
    stdg ?? "",
    mainLotNo ?? "",
    subLotNo ?? "",
    createdDate ?? "",
  ].join("|");

  // 출처 측 안정 ID(전체 맥락이 동일하면 동일 ID). pageNo/index 는 의도적으로 제외.
  const hash = createHash("sha256").update(basis, "utf8").digest("base64url");
  const id = `public-safety-address-${hash.slice(0, 24)}`;

  // 외부에 보여줄 표시 주소: 시·도 + 시·군·구 + 읍·면·동
  const displayParts = [sido, sigungu, eupmyeondong, ri].filter(
    (x): x is string => Boolean(x)
  );
  const displayAddress =
    displayParts.join(" ").replace(/\s+/g, " ").trim() || "(주소 요약 없음)";

  // 지오코딩 입력은 본번/부번까지 활용 (있을 때) → 좌표 정확도 ↑
  const lot =
    mainLotNo != null
      ? subLotNo != null
        ? `${mainLotNo}-${subLotNo}`
        : mainLotNo
      : null;
  const geocodeParts = [sido, sigungu, eupmyeondong, ri, lot].filter(
    (x): x is string => Boolean(x)
  );
  const addressForGeocoding =
    geocodeParts.join(" ").replace(/\s+/g, " ").trim() || displayAddress;

  return {
    id,
    sourceType: "gov24_openapi",
    sourceName: "성평등가족부 / 공공데이터포털 OpenAPI",
    createdDate,
    sido,
    sigungu,
    eupmyeondong,
    ri,
    mainLotNo,
    subLotNo,
    displayAddress,
    addressForGeocoding,
  };
}

function toItemArray(item: unknown): Record<string, unknown>[] {
  if (item == null) return [];
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  if (typeof item === "object") return [item as Record<string, unknown>];
  return [];
}

export type Gov24SaisFetchResult = {
  items: Record<string, unknown>[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
  headerResultCode: string;
  headerResultMsg: string;
};

export function parseGov24SaisResponse(json: unknown): Gov24SaisFetchResult {
  const root = json as Record<string, unknown>;
  const response = root.response as Record<string, unknown> | undefined;
  if (!response) {
    throw new Error("invalid_response_shape");
  }

  const header = response.header as Record<string, unknown> | undefined;
  const body = response.body as Record<string, unknown> | undefined;

  const headerResultCode = String(header?.resultCode ?? header?.resultcode ?? "");
  const headerResultMsg = String(header?.resultMsg ?? header?.resultmsg ?? "");

  if (!body) {
    return {
      items: [],
      pageNo: 1,
      numOfRows: 0,
      totalCount: 0,
      headerResultCode,
      headerResultMsg,
    };
  }

  const totalCount = Number(body.totalCount ?? body.totalcount ?? 0) || 0;
  const pageNo = Number(body.pageNo ?? body.pageno ?? 1) || 1;
  const numOfRows = Number(body.numOfRows ?? body.numofrows ?? 0) || 0;

  const itemsWrapper = body.items as Record<string, unknown> | undefined;
  const rawItem = itemsWrapper?.item;
  const items = toItemArray(rawItem);

  return {
    items,
    pageNo,
    numOfRows,
    totalCount,
    headerResultCode,
    headerResultMsg,
  };
}

export async function fetchGov24SexOffenderAddressesRaw(params: {
  serviceKey: string;
  pageNo: number;
  numOfRows: number;
}): Promise<{ json: unknown; status: number }> {
  const url = new URL(GOV24_SAIS_SEX_OFFENDER_ADDR_BASE);
  url.searchParams.set("serviceKey", params.serviceKey);
  url.searchParams.set("pageNo", String(params.pageNo));
  url.searchParams.set("numOfRows", String(params.numOfRows));
  url.searchParams.set("resultType", "json");

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json, text/plain;q=0.9,*/*;q=0.8" },
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("upstream_not_json");
  }

  return { json, status: res.status };
}
