# safetydata.go.kr (행정안전부 NDMS) API 셋업

지진해일 대피지구(`dataSn=1340`) 등 재난안전 데이터를 사용하기 위한 절차.

## 1. API 활용신청

1. https://www.safetydata.go.kr 회원가입 후 로그인
2. 대시보드 좌측 **"오픈API"** 메뉴 → 사용하려는 데이터셋 검색
   - 지진해일 대피지구: https://www.safetydata.go.kr/disaster-data/view?dataSn=1340
3. 데이터셋 페이지에서 **"활용신청"** 버튼 클릭
4. 사용 목적·예상 호출 건수 입력 후 신청 (보통 1~2일 내 승인)

승인되면 마이페이지 → "오픈API 활용신청 현황"에서:
- **인증키(Service Key)** 확인
- 부여받은 **OpenAPI 엔드포인트 URL** 확인 (예: `https://www.safetydata.go.kr/V2/api/DSSP-IF-XXXXX`)

## 2. 환경 변수 등록

`.env.local` (로컬) 및 Vercel 프로젝트 환경 변수에 추가:

```bash
SAFETYDATA_API_KEY=실제로_부여받은_Service_Key
# 부여받은 URL 이 기본 추정값과 다를 때만 입력
SAFETYDATA_TSUNAMI_API_URL=https://www.safetydata.go.kr/V2/api/DSSP-IF-XXXXX
```

> ⚠️ 키는 **서버 전용**입니다. `NEXT_PUBLIC_` 접두어를 붙이지 마세요.

## 3. Supabase 캐시 테이블

기존 `public_safety_address_cache` 테이블을 재사용합니다 (`category =
'tsunami_evacuation_site'` 으로 구분). **추가 마이그레이션 불필요**.

## 4. 데이터 채워넣기

### 옵션 A — CLI 스크립트 (권장 · 1회성 대량 동기화)

```bash
npx tsx scripts/sync-tsunami-evacuation.ts --pages=10 --numOfRows=200
```

- `--pages=N` : 1..N 페이지 순차 수집
- `--pageNo=N` : 단일 페이지만
- `--numOfRows=N` : 페이지당 행 수 (최대 200)

### 옵션 B — 관리자 API (서버 자동화 또는 검증용)

```
POST /api/admin/disasters/tsunami-evacuation/sync
Content-Type: application/json
{ "pageNo": 1, "numOfRows": 200 }
```

권한: `profiles.role IN ('admin','moderator')` 또는 `ADMIN_EMAILS` 포함 사용자.

## 5. 지도에서 확인

배포 후 한국어 모드 → 사이드바의 **"지진해일 대피지구"** 토글 ON →
초록(emerald) 원형 마커 표시. 마커 클릭 시 시설명·주소·갱신일 팝업.

## 6. 트러블슈팅

| 증상                                  | 원인                                       | 조치 |
| ------------------------------------- | ------------------------------------------ | ---- |
| `safetydata API 키가 설정되지 않았습니다` | `SAFETYDATA_API_KEY` 누락                  | `.env.local` 에 추가 후 dev 재시작 |
| `safetydata 응답이 JSON 이 아닙니다`   | 잘못된 endpoint URL 또는 파라미터          | `SAFETYDATA_TSUNAMI_API_URL` 을 부여받은 정확한 URL 로 |
| `safetydata API 오류 code=...`        | 키 미승인·일일한도 초과·서비스 점검         | safetydata.go.kr 마이페이지에서 상태 확인 |
| 지도에 마커가 안 보임                 | 좌표가 비어있거나 캐시가 비어있음          | CLI 동기화 재실행 / Supabase 캐시 행 확인 |

## 7. 보안 / 개인정보

- 캐시에는 시설명·주소·시도/시군구·좌표만 저장됨
- 응답에 포함될 수 있는 식별성 높은 필드는 정규화 단계에서 누락
- `raw_json` 등 원본 응답은 저장하지 않음
