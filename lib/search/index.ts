/**
 * 검색 Provider 레지스트리.
 *
 * 환경변수 SEARCH_PROVIDER 로 기본 Provider 를 선택합니다.
 *   - "naver" (기본)
 *   - "tavily"
 *   - "daum"
 */

import type { SearchProvider } from "./types";
import { NaverSearchProvider } from "./NaverSearchProvider";

export * from "./types";

let defaultProvider: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (defaultProvider) return defaultProvider;

  const choice = process.env.SEARCH_PROVIDER ?? "naver";
  switch (choice) {
    case "naver":
    default:
      defaultProvider = new NaverSearchProvider();
      break;
    // TODO(Phase 2): TavilySearchProvider, DaumSearchProvider 추가
  }
  return defaultProvider;
}
