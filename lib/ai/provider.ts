/**
 * AI Provider 추상화.
 *
 * Phase 3 에서 OpenAI / Anthropic / 기타 LLM 을 끼워넣을 수 있도록 인터페이스 분리.
 * 현재는 NoopAIProvider 만 활성화 (비용 0, 동작 없음).
 */

import type { AccidentCategory, LatLng } from "@/types";
import { features } from "@/lib/features";

export interface AISummary {
  summary: string;
  category: AccidentCategory;
  confidence: number;
}

export interface AIProvider {
  /** 텍스트(뉴스 본문 등)에서 사고 발생 좌표 추출 */
  extractLocation(text: string, hint?: string): Promise<LatLng | null>;

  /** 텍스트를 사고 카테고리로 분류 */
  classify(text: string): Promise<AccidentCategory>;

  /** 긴 텍스트를 한 줄 요약 + 분류 + 신뢰도 점수 */
  summarize(text: string): Promise<AISummary>;

  /** 두 사건이 동일 사고인지 판단 (중복 제거) */
  isDuplicate(a: string, b: string): Promise<boolean>;
}

/**
 * 기본 NoOp 구현. AI 비활성화 시 사용.
 * 모든 메서드가 안전한 기본값을 반환하여 호출 측 로직이 깨지지 않게 합니다.
 */
export class NoopAIProvider implements AIProvider {
  async extractLocation(): Promise<LatLng | null> {
    return null;
  }

  async classify(): Promise<AccidentCategory> {
    return "etc";
  }

  async summarize(text: string): Promise<AISummary> {
    return {
      summary: text.slice(0, 80),
      category: "etc",
      confidence: 0,
    };
  }

  async isDuplicate(): Promise<boolean> {
    return false;
  }
}

let provider: AIProvider | null = null;

/**
 * 환경 / Feature flag 에 따라 적절한 AI Provider 를 반환합니다.
 * Phase 3 에서 OpenAIProvider 구현 후 여기 분기 추가만 하면 됩니다.
 */
export function getAIProvider(): AIProvider {
  if (provider) return provider;

  if (!features.AI_ENABLED) {
    provider = new NoopAIProvider();
    return provider;
  }

  // TODO(Phase 3): OpenAI 구현체 동적 import
  // const { OpenAIProvider } = await import("./openai-provider");
  // provider = new OpenAIProvider();
  provider = new NoopAIProvider();
  return provider;
}
