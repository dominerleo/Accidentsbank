/**
 * 데이터 소스 레지스트리.
 *
 * 새 출처를 추가하려면:
 * 1. AccidentSource 인터페이스 구현체 작성
 * 2. 이 파일의 sources 배열에 등록
 * 3. (선택) lib/features.ts 에 Feature flag 추가
 */

import type { AccidentSource } from "./types";
import { UserSource } from "./UserSource";
import { TaasSource } from "./TaasSource";
import { NewsSource } from "./NewsSource";
import { WikiSource } from "./WikiSource";

export * from "./types";

export const sources: AccidentSource[] = [
  new UserSource(),
  new TaasSource(),
  new NewsSource(),
  new WikiSource(),
];

/** 활성화된 소스만 필터링 */
export function getActiveSources(): AccidentSource[] {
  return sources.filter((s) => s.enabled);
}

/** type 으로 소스 조회 */
export function getSourceByType(type: string): AccidentSource | undefined {
  return sources.find((s) => s.type === type);
}
