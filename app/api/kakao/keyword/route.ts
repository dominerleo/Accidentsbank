import { NextResponse } from "next/server";
import { searchKeywordPlaces } from "@/lib/kakao/keywordSearch";

/**
 * GET /api/kakao/keyword?q=강남역&size=15
 * 카카오 로컬 키워드 장소 검색 (KAKAO_REST_API_KEY).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "검색어 q 가 필요합니다." }, { status: 400 });
  }

  const sizeRaw = searchParams.get("size");
  const size = sizeRaw ? Number(sizeRaw) : 15;

  try {
    const { places, totalCount } = await searchKeywordPlaces(q, size);
    return NextResponse.json({ places, totalCount });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
