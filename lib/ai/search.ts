import type { Accident, LatLng } from "@/types";
import { getAIProvider } from "./provider";
import { features } from "@/lib/features";

export interface AISearchParams {
  location: LatLng;
  year: number;
  radiusKm?: number;
}

/**
 * AI 기반 과거 사고 탐색 (Phase 3+).
 *
 * 흐름:
 * 1) 검색 Provider (네이버/Tavily) 로 뉴스 수집
 * 2) AIProvider.summarize 로 요약/분류/좌표 추출
 * 3) sourceType: "ai" 로 Supabase 저장
 *
 * 현재는 AI_ENABLED=false 이므로 빈 배열 반환.
 */
export async function searchHistoricalAccidents(
  _params: AISearchParams
): Promise<Accident[]> {
  if (!features.AI_ENABLED) {
    return [];
  }

  const ai = getAIProvider();
  void ai;
  // TODO(Phase 3): SearchProvider 로 뉴스 수집 → AI 요약 → DB 저장
  return [];
}
