# 공식 CSV 적재 스펙 (`parseOfficialAccidentsCsv`)

파일: [lib/sources/officialCsv.ts](../lib/sources/officialCsv.ts)  
실행: `npm run import:batch -- --source=official --csv=<경로>`

## 공통

- 첫 행은 **헤더**(컬럼명, 대소문자 무관).
- UTF-8 권장.
- `category`는 `incident` | `crime` | `news` | `etc` | `misc` | `event` | `이벤트` | 한글 `기타` (`event`/`이벤트`→`etc` 표시명 이벤트, `기타`/`misc`/`other`→`misc` 표시명 기타, 미지정·알 수 없음→`etc`).

## 모드 A — 사건별 점 (`lat` + `lng` 헤더가 있을 때)

| 컬럼 | 필수 | 설명 |
|------|------|------|
| lat, latitude | 하나 | 위도 |
| lng, lon, longitude, long | 하나 | 경도 |
| title | 예 | 제목 |
| category | 예 | 분류 |
| occurred_at, date, datetime | 예 | 시각 (ISO 권장) |
| description, desc | 선택 | 본문 |
| external_id, id | 선택 | upsert 키 (없으면 자동) |

## 모드 B — 서울 자치구 집계 (`lat`/`lng` 없이 집계 컬럼만 있을 때)

구 중심 좌표는 [data/seoul/seoul-gu-centroids.json](../data/seoul/seoul-gu-centroids.json) (`version` 필드가 `metadata.centroid_version`에 기록됨).

| 컬럼 | 필수 | 설명 |
|------|------|------|
| year, yyyy, yr | 예 | 연도 (숫자) |
| value, count, cnt, cases | 예 | 건수·값 |
| metric, indicator, 지표 | 예 | 지표 이름 (제목에 포함) |
| category | 예 | 분류 |
| gu_name, gu, district, sigungu | gu_code 없을 때 예 | 예: `강남구`, `서울특별시 강남구` |
| gu_code, code, sigungu_code | gu_name 없을 때 예 | 예: `11680` |
| occurred_at, date, asof | 선택 | 없으면 해당 연도 `7월 1일` UTC |
| description, desc | 선택 | |
| external_id, id | 선택 | 없으면 `agg:{year}:{구코드}:{metric}` |
| source_url, url, link | 선택 | 원 통계표 URL 등 → `metadata.source_url` |

제목 자동 형식: `「{year} 서울 {구명} {metric}」집계 {value}건`

## 샘플

- 점: [sample-official.csv](./sample-official.csv)
- 집계: [sample-seoul-aggregate.csv](./sample-seoul-aggregate.csv)
