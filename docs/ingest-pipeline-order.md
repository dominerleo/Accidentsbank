# 서울 장기 데이터 적재 순서 (권장)

목표: **구 단위 집계 → 좌표 공개 사건 → 뉴스 보강** 순으로 채우면 지도·목록이 안정적으로 쌓입니다.

## 1단계: 구 집계 (CSV 집계 모드)

1. [data-inventory-seoul.md](./data-inventory-seoul.md)로 출처·연도 범위를 정리합니다.
2. 공공 표를 [csv-official-spec.md](./csv-official-spec.md) **모드 B** 형식으로 변환합니다.  
   샘플: [sample-seoul-aggregate.csv](./sample-seoul-aggregate.csv)
3. Supabase에 `external_source_id` 유니크 마이그레이션이 적용돼 있는지 확인합니다.
4. 실행:

```bash
npm run import:batch -- --source=official --csv=docs/sample-seoul-aggregate.csv
```

5. 앱에서 해당 행이 **구 centroid**에 찍히는지, 제목이 `「연도 서울 …」집계` 형태인지 확인합니다.

## 2단계: 사건별 좌표 공개 데이터

- TAAS·기관에서 **위도/경도**가 포함된 CSV면 **모드 A**로 동일 스크립트 적재.
- `external_id`는 재실행 시 덮어쓰기 키이므로 **출처+원본 키** 규칙을 통일합니다.

## 3단계: 뉴스 보강 (최근 구간)

- `.env.local`에 네이버·카카오 REST 키 설정.
- `IMPORT_FORCE_NEWS=1` 또는 `FEATURE_NEWS_SEARCH=true`.

```bash
npm run import:batch -- --source=news --keyword=서울화재 --region=서울 --limit=15 --from-year=2015 --to-year=2024
```

- API 한도·지오코딩 오탐을 고려해 **소량씩** 돌립니다.

## 검증 체크리스트

- [ ] `public.accidents`에서 `source_type` / `metadata->csv_mode` 로 점·집계 구분 가능
- [ ] 동일 `external_source_id`로 재실행 시 중복 없이 갱신되는지
- [ ] 집계 행 설명·출처 URL이 사용자에게 오해 없이 보이는지

## 자산

- 구 centroid: [data/seoul/seoul-gu-centroids.json](../data/seoul/seoul-gu-centroids.json) (`version` 갱신 시 집계 재생성 여부 판단)
