# 지진해일 대피지구 데이터 셋업

지진해일 대피지구(NDMS / 행정안전부) 데이터를 지도에 표시하기 위한 절차.

> **권장: 경로 A (data.go.kr)** — 보통 즉시 승인되고, 응답에 좌표가 직접 포함되어 있어 가장 빠릅니다.
>
> **대체: 경로 B (safetydata.go.kr)** — 같은 데이터지만 활용신청 승인이 1~2일 걸립니다.

---

## 경로 A — data.go.kr OpenAPI (권장 · 1~5분)

### A-1. 활용신청

1. https://www.data.go.kr/data/15138870/openapi.do 접속 (행정안전부\_지진해일 긴급대피장소)
2. 우측 상단 **"활용신청"** 클릭 → 사용 목적 한 줄 입력 → 신청 (보통 자동 승인)
3. 승인되면 **마이페이지 → "오픈API · 활용신청 현황"** 에서:
   - **일반 인증키(Decoding)** 복사 — 이게 `SAFETYDATA_API_KEY` 값
   - 좌측 상단 **"참고문서"** 또는 **"API 명세"** 의 정확한 **요청 URL** 복사
     (예: `https://apis.data.go.kr/1741000/EmgncyEvcltnPlaceData/getEmgncyEvcltnPlaceData` 형태 — host/경로까지만, query string 제외)

### A-2. 환경 변수 등록

`.env.local` (로컬) 및 Vercel 프로젝트 설정 → Environment Variables 에 추가:

```bash
SAFETYDATA_API_KEY=위에서_복사한_Decoding_일반_인증키
SAFETYDATA_TSUNAMI_API_URL=위에서_복사한_요청_URL
```

> 키는 **서버 전용**입니다. `NEXT_PUBLIC_` 접두어 절대 붙이지 마세요.
> Vercel 에 추가했다면 **Redeploy** 필요. 로컬은 dev 서버 재시작.

### A-3. 동기화 실행 (1회)

```bash
npx tsx scripts/sync-tsunami-evacuation.ts --pages=20 --numOfRows=200
```

성공 출력:

```
page 1 (numOfRows=200) ... fetched=200 upserted=200 hadCoords=200 geocodeFailed=0 skipped=0
...
=== summary ===
{ "fetched": ..., "upserted": ..., "hadCoords": ... }
```

`hadCoords > 0` 이면 응답에 좌표가 포함된 것 — 끝났습니다.
지도 새로고침 → "지진해일 대피지구" 토글 ON → 초록 마커 표시.

---

## 경로 B — safetydata.go.kr (대체 · 1~2일 승인 대기)

### B-1. 활용신청

1. https://www.safetydata.go.kr 회원가입 후 로그인
2. https://www.safetydata.go.kr/disaster-data/view?dataSn=1340 → **"활용신청"**
3. 사용 목적·예상 호출 건수 입력 후 신청 (1~2일 내 승인)

승인 후 마이페이지 → "오픈API 활용신청 현황":

- **인증키(Service Key)** → `SAFETYDATA_API_KEY`
- 부여받은 **OpenAPI 엔드포인트 URL** → `SAFETYDATA_TSUNAMI_API_URL`
  (예: `https://www.safetydata.go.kr/V2/api/DSSP-IF-XXXXX`)

이후 단계는 경로 A 의 A-2, A-3 와 동일.

---

## Supabase 캐시 테이블

기존 `public_safety_address_cache` 테이블을 재사용 (`category =
'tsunami_evacuation_site'` 으로 구분). **추가 마이그레이션 불필요**.

## 관리자 API (수동 호출 — 선택)

CLI 외에 HTTP 로도 동일 동기화 가능:

```
POST /api/admin/disasters/tsunami-evacuation/sync
Content-Type: application/json
{ "pageNo": 1, "numOfRows": 200 }
```

권한: `profiles.role IN ('admin','moderator')` 또는 `ADMIN_EMAILS` 포함 사용자만.

## 트러블슈팅

| 증상                                          | 원인                                       | 조치                                           |
| --------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `safetydata API 키가 설정되지 않았습니다`     | `SAFETYDATA_API_KEY` 누락                  | `.env.local` 에 추가 후 dev 재시작             |
| `safetydata 응답이 JSON 이 아닙니다`          | 잘못된 endpoint URL 또는 파라미터          | `SAFETYDATA_TSUNAMI_API_URL` 을 정확한 URL 로  |
| `safetydata API 오류 code=...`                | 키 미승인·일일한도 초과·서비스 점검        | data.go.kr 또는 safetydata.go.kr 마이페이지 확인 |
| `fetched=N` 인데 `upserted=0`, 좌표 모두 null | 응답 필드명이 normalizer 후보에 없음       | 응답 sample 1건 공유 → `lib/disasters/safetydataTsunamiEvacuation.ts` 의 `normalizeTsunamiEvacuationItem` 후보 키 보강 |
| 지도에 마커가 안 보임 (`upserted` 는 정상)    | 좌표 없음 / 토글 OFF / 캐시 클라 못 읽음    | Supabase 캐시 행 직접 조회 / 토글 ON 재확인    |

## 보안 / 개인정보

- 캐시에는 시설명·주소·시도/시군구·좌표만 저장됨 (개인정보 없음)
- 응답에 포함될 수 있는 식별성 높은 필드는 정규화 단계에서 누락
- `raw_json` 등 원본 응답은 저장하지 않음
