/**
 * 카카오맵 level(확대 레벨): 숫자가 클수록 멀리(줌아웃).
 * 마커 픽셀 크기를 level 구간별로 줄여 겹침을 완화한다.
 * (추후 MarkerClusterer 도입 시 이 값은 클러스터 임계값과 함께 조정)
 */
export function markerDiameterPx(level: number): number {
  if (level <= 4) return 44;
  if (level <= 6) return 36;
  if (level <= 9) return 30;
  return 24;
}

/** 지도 점(도트) 마커 — 줌에 따라 크기 조절 */
export function dotDiameterPx(level: number): number {
  if (level <= 4) return 18;
  if (level <= 6) return 15;
  if (level <= 9) return 12;
  return 10;
}
