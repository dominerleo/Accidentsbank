# 서울 시내 장기(40~50년) 데이터 인벤토리 (작업용)

아래는 **조사·다운로드 시 직접 URL·기간을 확인**해야 하는 출처 목록입니다.  
공공데이터포털(https://www.data.go.kr) 검색어 예시를 함께 적었습니다. **이용허락범위·출처 표기**는 각 데이터셋 상세 페이지에서 확인하세요.

| 영역 | 검색·출처 힌트 | 공간 단위 | 장기 구간 참고 | 앱 `category` 예 | 비고 |
|------|----------------|-----------|----------------|------------------|------|
| 교통사고·도로 | `data.go.kr` → 「교통사고」「TAAS」「도로교통공단」「서울 교통사고」 | 사고지점(가능 시), 시군구 집계 | 데이터마다 상이(최근 10~20년 상세 공개가 흔함) | `incident` | 좌표 없으면 [seoul-gu-centroids.json](../data/seoul/seoul-gu-centroids.json)로 구 단위 점 |
| 범죄·치안 | 경찰청 통계 「범죄 발생」「검거」「시군구」 | 시·도 / 시군구 | 연도별 표 공개(항목 개편 이력 확인) | `crime` | 집계 행은 제목에 「연도·구·지표」 명시 |
| 화재·구조 | 소방청·서울시 「화재」「출동」「통계」 | 본부·시군구 | 공개 연도 범위는 기관별 상이 | `incident` 또는 `etc`(앱 표시: 이벤트) | 사건별 좌표 공개분은 드물 수 있음 |
| 인구·면적 | 통계청 「인구」「주민등록」「행정구역」 | 시군구 | 장기 시계열 비교 시 **구역 개편** 주의 | (보조 메타) | 건수 대비율 산출 시 사용 |
| 행정경계 | 행안부 「행정구역」「경계」「SHP」 | 폴리곤 | 시점별 레이어 선택 | — | centroid는 별도 자산으로 관리 |
| 뉴스·언론 | 네이버 뉴스 API 등 ([NewsSource](../lib/sources/NewsSource.ts)) | 지오코딩 추정점 | API·아카이브 **보존 기간** 한계 | `news` | 최근 구간 보강용, `confidence` 낮게 |

## 다음 작업(체크리스트)

1. 각 행의 **실제 다운로드 URL**·**최초/최종 연도**·**갱신 주기**를 스프레드시트에 복사해 두기.
2. 구역 개편이 있는 연도는 **별도 매핑 테이블**로 구 코드를 정규화.
3. `metadata` JSON에 `source_url`, `license_note`, `retrieved_at` 저장 권장.

## 관련 코드·문서

- 텍스트·CSV 자료의 “크기” 해석(파일 vs DB vs 행 수): [text-data-size.md](./text-data-size.md)
- CSV 점/집계 스펙: [csv-official-spec.md](./csv-official-spec.md)
- CSV 파서: [lib/sources/officialCsv.ts](../lib/sources/officialCsv.ts)
- 배치 실행: [scripts/import-batch.ts](../scripts/import-batch.ts)
- 적재 순서: [ingest-pipeline-order.md](./ingest-pipeline-order.md)
