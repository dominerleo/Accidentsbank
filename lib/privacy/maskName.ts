const DEFAULT_IDENTIFIER_FIELD_NAMES = [
  "name",
  "fullName",
  "personName",
  "userName",
  "username",
  "nm",
  "성명",
  "이름",
  "대상자명",
  "공개대상자명",
  "성범죄자명",
  "offenderName",
  "offndrNm",
] as const;

function maskWord(word: string): string {
  const chars = Array.from(word);
  if (chars.length <= 1) return "*";
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}*${chars[chars.length - 1]}`;
}

/**
 * 이름 또는 이름처럼 식별성이 높은 문자열을 단어 단위로 마스킹한다.
 *
 * - 1글자: *
 * - 2글자: 홍길 -> 홍*
 * - 3글자 이상: 홍길동 -> 홍*동, ABC -> A*C
 * - 공백 포함: 각 단어별 마스킹, 공백은 원형 유지
 */
export function maskName(name: string): string {
  return name
    .trim()
    .split(/(\s+)/)
    .map((part) => (part.trim() ? maskWord(part) : part))
    .join("");
}

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase().replace(/[\s_-]/g, "");
}

const DEFAULT_IDENTIFIER_FIELD_SET = new Set(
  DEFAULT_IDENTIFIER_FIELD_NAMES.map(normalizeFieldName)
);

export function isPotentialIdentifierField(fieldName: string): boolean {
  return DEFAULT_IDENTIFIER_FIELD_SET.has(normalizeFieldName(fieldName));
}

/**
 * 관리자 디버그 등에서 raw item 일부를 보여줄 때 원본 이름값이 새지 않도록
 * 이름 후보 필드가 문자열인 경우에만 마스킹한 복사본을 반환한다.
 */
export function maskPotentialIdentifierFields(
  raw: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      isPotentialIdentifierField(key) && typeof value === "string"
        ? maskName(value)
        : value,
    ])
  );
}
