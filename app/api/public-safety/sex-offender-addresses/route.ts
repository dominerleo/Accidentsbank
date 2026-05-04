import { NextResponse } from "next/server";
import {
  fetchGov24SexOffenderAddressesRaw,
  normalizeSexOffenderAddressItem,
  parseGov24SaisResponse,
} from "@/lib/public-safety/gov24SexOffenderAddress";
import {
  isPotentialIdentifierField,
  maskPotentialIdentifierFields,
} from "@/lib/privacy/maskName";

const MAX_NUM_OF_ROWS = 100;

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max?: number
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  const i = Math.floor(n);
  if (max != null) return Math.min(i, max);
  return i;
}

function buildMaskedIdentifierDebug(raw: Record<string, unknown>) {
  const masked = maskPotentialIdentifierFields(raw);
  const entries = Object.entries(masked).filter(([key]) =>
    isPotentialIdentifierField(key)
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/**
 * GET /api/public-safety/sex-offender-addresses?pageNo=1&numOfRows=20&debug=1
 *
 * 공공데이터포털 성범죄자 공개·고지 지번 주소 정보.
 * 서버에서만 GOV24_API_KEY 를 사용하고 정규화된 주소 정보만 반환한다.
 *
 * 개인정보 보호:
 * - 이름·사진·상세 범죄내용·원본 raw JSON 은 반환하지 않는다.
 * - debug=1 에서도 원본 이름값은 출력하지 않고, 이름 후보 필드가 있으면 마스킹 값만 반환한다.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wantsDebug = searchParams.get("debug") === "1";

  if (wantsDebug && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "debug는 production에서 사용할 수 없습니다." },
      { status: 403 }
    );
  }

  const serviceKey = process.env.GOV24_API_KEY?.trim();
  if (!serviceKey) {
    return NextResponse.json(
      { error: "GOV24_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const pageNo = parsePositiveInt(searchParams.get("pageNo"), 1);
  const numOfRows = parsePositiveInt(
    searchParams.get("numOfRows"),
    20,
    MAX_NUM_OF_ROWS
  );

  try {
    const { json, status } = await fetchGov24SexOffenderAddressesRaw({
      serviceKey,
      pageNo,
      numOfRows,
    });

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { error: "공공데이터 API 요청이 실패했습니다." },
        { status: 502 }
      );
    }

    let parsed;
    try {
      parsed = parseGov24SaisResponse(json);
    } catch {
      return NextResponse.json(
        { error: "공공데이터 응답 형식을 해석할 수 없습니다." },
        { status: 502 }
      );
    }

    if (parsed.headerResultCode && parsed.headerResultCode !== "00") {
      return NextResponse.json(
        {
          error: "공공데이터 API 오류",
          code: parsed.headerResultCode,
          message: parsed.headerResultMsg || undefined,
        },
        { status: 502 }
      );
    }

    const firstRaw = parsed.items[0];
    const maskedIdentifierFields =
      wantsDebug && process.env.NODE_ENV !== "production" && firstRaw
        ? buildMaskedIdentifierDebug(firstRaw)
        : undefined;
    const debugPayload =
      wantsDebug && process.env.NODE_ENV !== "production" && firstRaw
        ? {
            debug: {
              firstItemKeys: Object.keys(firstRaw).sort(),
              ...(maskedIdentifierFields
                ? { maskedIdentifierFields }
                : {}),
            },
          }
        : {};

    const items = parsed.items.map((raw, index) =>
      normalizeSexOffenderAddressItem(raw, pageNo, index)
    );

    return NextResponse.json({
      items,
      pageNo,
      numOfRows,
      totalCount: parsed.totalCount,
      ...debugPayload,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    if (code === "upstream_not_json") {
      return NextResponse.json(
        { error: "공공데이터 응답이 JSON이 아닙니다." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
