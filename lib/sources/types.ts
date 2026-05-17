/**
 * 데이터 소스 어댑터 공통 타입.
 *
 * 새 출처를 추가할 때 이 인터페이스만 구현하면 됩니다.
 * - 공공데이터 (TAAS, 소방청 등)
 * - 뉴스 검색 (네이버, Daum)
 * - 위키 (나무위키, 위키백과)
 * - 사용자 입력
 * - AI 추론
 */

import type { AccidentInput, LatLng } from "@/types";

/** 모든 출처에서 공통으로 받는 검색 파라미터 */
export interface SourceQuery {
  /** 좌표 중심 */
  center?: LatLng;
  /** 반경 (km) */
  radiusKm?: number;
  /** 행정구역·지명 힌트 (지오코딩 쿼리에 합침) */
  region?: string;
  /** 배치용 CSV 경로 (TaasSource 등, 서버/스크립트 전용) */
  dataFilePath?: string;
  /** 연도 범위 시작 */
  fromYear?: number;
  /** 연도 범위 끝 */
  toYear?: number;
  /** 키워드 */
  keyword?: string;
  /** 최대 결과 수 */
  limit?: number;
}

/** 출처별 raw 데이터를 정규화한 사고 입력 + 출처 메타 */
export interface NormalizedAccident extends AccidentInput {
  sourceType: string;
  /** 출처별 추가 정보 (jsonb 로 저장) */
  metadata?: Record<string, unknown>;
  /** AI/검수 신뢰도 (0~1) */
  confidence?: number;
  /** 자유 태그 */
  tags?: string[];
  /** 사진/영상 링크 */
  mediaUrls?: string[];
}

export interface AccidentSource {
  /** 출처 식별자 (DB의 source_type 컬럼에 저장) */
  readonly type: string;
  /** UI 표시 라벨 */
  readonly label: string;
  /** 활성화 여부 (Feature flag 연동) */
  readonly enabled: boolean;
  /** 데이터 검색/수집 */
  fetch(query: SourceQuery): Promise<NormalizedAccident[]>;
}
