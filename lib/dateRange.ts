/** `YYYY-MM-DD` 입력을 KST 하루의 시작/끝 timestamptz 로 변환 (API 쿼리용). */
export function koreaDayStartIso(dateYmd: string): string {
  if (dateYmd.length > 10) return dateYmd;
  return `${dateYmd}T00:00:00+09:00`;
}

export function koreaDayEndIso(dateYmd: string): string {
  if (dateYmd.length > 10) return dateYmd;
  return `${dateYmd}T23:59:59.999+09:00`;
}

/** 로컬 달력 기준 YYYY-MM-DD */
export function localDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
