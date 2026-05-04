# 텍스트 기반 자료의 “크기” 해석

텍스트·CSV 형태의 공공·비공식 자료를 넣을 때 **“크기”**는 한 가지 숫자로 정해지지 않습니다. 아래 세 층으로 나눠 보면 계획·용량 산정이 쉬워집니다.

## 어떤 크기를 말하는지

| 관점 | 의미 | 대략적인 감 |
|------|------|-------------|
| **원본 파일** | 공공데이터 CSV·엑셀을 UTF-8 CSV로 둔 경우의 디스크 용량 | **출처·연도·항목마다 전부 다름**. [data-inventory-seoul.md](./data-inventory-seoul.md)에는 MB 단위 고정값이 없음 → 받은 뒤 OS에서 파일 크기로 확인하는 것이 정확함. |
| **DB 한 행** | `accidents` 한 건의 `title`, `description`, `metadata` 등 | 스키마상 `text`·`jsonb`는 **길이 제한이 거의 없음**(PostgreSQL 실무상 필드당 매우 큰 텍스트도 가능, 다만 인덱스·TOAST·쿼리 비용 증가). 일반적인 제목·본문·URL 몇 개는 **수 KB~수십 KB/행** 수준이 흔함. |
| **전체 적재량** | 행 수 × 평균 행 크기 | 예: 집계 CSV면 **연도×구×지표** 조합 수만큼 행이 늘어남. 사건별 점 데이터면 원본 건수와 거의 1:1. |

근거: [supabase/schema.sql](../supabase/schema.sql)의 `public.accidents`에서 `title`, `description`, 주소·`news_url` 등이 `text`, `metadata`가 `jsonb`로 정의됨.

## 이 프로젝트 적재와의 관계

- 공식 CSV 경로: [csv-official-spec.md](./csv-official-spec.md) → [lib/sources/officialCsv.ts](../lib/sources/officialCsv.ts) → [scripts/import-batch.ts](../scripts/import-batch.ts).
- 배치 스크립트의 **`--batch` 기본값 40**은 **한 번에 upsert하는 행 개수**이지, “입력 파일 최대 크기” 제한이 아님.
- 샘플 파일([sample-seoul-aggregate.csv](./sample-seoul-aggregate.csv), [sample-official.csv](./sample-official.csv))은 **몇 줄짜리**라 용량은 무시할 수준.

## 결론

- **“텍스트 기반이라서 작다/크다”로 단정할 수 없음.** 같은 텍스트라도 **행 수와 컬럼·본문 길이**에 따라 원본 파일은 **수십 KB ~ 수 GB**까지 갈 수 있음.
- **DB 쪽 제약**은 “필드에 못 넣는다”보다 **행이 많아질수록 저장·백업·조회 비용**이 커지는 쪽이 큼.

## 정확한 숫자가 필요할 때

- **특정 다운로드 파일**: 해당 파일을 받은 뒤 디스크 상 크기(바이트)와 `wc -l`로 행 수 확인.
- **이미 Supabase에 쌓인 분량**: SQL로 `count(*)` 및 필요 시 `pg_column_size` / `length`로 샘플링.

특정 출처(교통·범죄·화재 등)나 실제 파일명이 정해지면, 그 유형 기준으로 용량 범위를 더 좁힐 수 있음.
