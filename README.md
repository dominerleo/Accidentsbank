# 사고은행 (Accidents Bank)

우리 동네와 전 세계의 사건·사고 기록을 지도 위에 저장하고 탐색하는 Next.js 앱입니다. 한국어 모드는 카카오맵 중심, English 모드는 OpenStreetMap/Leaflet 중심으로 동작합니다.

이 문서는 GitHub, Supabase, Vercel, MCP, API, 배치 적재 흐름을 포함해 CODEX 또는 다른 코딩 에이전트가 이어서 개발할 때 필요한 인수인계 정보입니다.

## 현재 상태 요약

- 프로젝트 경로: `/Users/leopdsmac/Documents/Personal/사고관리앱`
- GitHub 원격 저장소: `https://github.com/dominerleo/Accidentsbank.git`
- 운영 도메인: `https://accidentsbank.com`
- Vercel 프로젝트: `accidentsbank` (Production branch: `main`)
- Supabase 프로젝트 ref: `jfhkwnscplznhzloddko`
- 현재 개발 브랜치: `release/client-error-fixes`. 운영 반영은 GitHub PR로 `main`에 머지하면 Vercel이 자동 배포합니다.
- 주요 앱: 사고 지도, 사고 등록/수정/삭제, 카테고리/날짜 필터, 커뮤니티 게시판 MVP, 뉴스/공공 CSV 배치 적재, 공공안전 주소 레이어, 재난 대피시설 레이어
- 기본 개발 서버: `http://localhost:3002`
- 비밀값 원칙: `.env.local`, Vercel Secrets, GitHub Actions Secrets, MCP access token은 절대 커밋하지 않습니다.

최근 중요한 운영 반영:

- PR #1: `release/client-error-fixes` -> `main` 머지. 재난 대피시설 다중 카테고리 조회, 지진 옥외대피소 동기화, Leaflet 재난 마커 반영.
- PR #2: 재난 대피시설 팝업 긴 주소 줄바꿈 수정.
- PR #3: `DSSP-IF-00103` 지진 옥외대피소 `XMAP_CRTS`/`YMAP_CRTS`/`GEOM` Web Mercator(EPSG:3857) 좌표를 WGS84 위경도로 변환.
- PR #4: `/api/public-safety/address-cache`가 Supabase/PostgREST 1000건 제한을 넘도록 1000건 단위 `range()` 페이지 조회.
- 운영 검증: `https://accidentsbank.com/api/public-safety/address-cache?category=tsunami_evacuation_site,earthquake_outdoor_shelter&limit=5000` 가 `count=2674`를 반환했습니다. 구성은 `safetydata_earthquake_outdoor_shelter` 2604건 + 기존 CSV 좌표 70건입니다.

## 기술 스택

- Framework: Next.js 15 App Router, React 19, TypeScript strict
- Styling: Tailwind CSS
- State: Zustand
- Map: `react-kakao-maps-sdk`, Leaflet/OpenStreetMap
- Database/Auth: Supabase PostgreSQL, PostGIS, Supabase Auth, `@supabase/ssr`
- Search/AI 준비: Naver Search API, OpenAI API, Tavily API
- Batch: `tsx`, Supabase service role client

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

필수 환경변수를 `.env.local`에 채운 뒤 브라우저에서 `http://localhost:3002`로 접속합니다.

자주 쓰는 명령:

```bash
npm run dev
npm run build
npm run type-check
npm run lint
npm run import:batch -- --source=news --keyword=교통사고 --region=서울 --limit=10
npm run import:batch -- --source=official --csv=docs/sample-official.csv
```

주의: `npm run lint`는 `next lint`를 사용합니다. Next.js 15/ESLint 9 조합에서 로컬 환경에 따라 추가 설정이 필요할 수 있으므로, 실패 시 `npm run type-check`와 `npm run build`도 함께 확인합니다.

## 환경변수

환경변수 원본 템플릿은 `.env.local.example`입니다.

클라이언트 공개 변수:

- `NEXT_PUBLIC_KAKAO_APP_KEY`: 카카오 JavaScript 키
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `NEXT_PUBLIC_IS_KOREA`: 한국 모드 기본값, 보통 `true`
- `NEXT_PUBLIC_ENABLE_DEV_DELETE`: 개발용 삭제 UI 노출 여부

서버 전용 변수:

- `SUPABASE_SERVICE_ROLE_KEY`: 서버/배치/admin 작업 전용. 브라우저 코드에서 import 금지
- `KAKAO_REST_API_KEY`: 서버 지오코딩/키워드 검색/배치용
- `GOV24_API_KEY`: 정부24/공공안전 API용
- `SAFETYDATA_API_KEY`: 행정안전부 재난안전데이터망 API 키. 지진 옥외대피소/지진해일 동기화에 사용
- `SAFETYDATA_EARTHQUAKE_SHELTER_API_URL`: 지진 옥외대피소 API 엔드포인트가 기본값과 다를 때만 지정. 기본값은 `https://www.safetydata.go.kr/V2/api/DSSP-IF-00103`
- `SAFETYDATA_TSUNAMI_API_URL`: 지진해일 대피지구 API 엔드포인트가 기본값과 다를 때 지정. 현재 코드 기본값은 `https://www.safetydata.go.kr/V2/api/DSSP-IF-10164`
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: 네이버 뉴스 검색
- `OPENAI_API_KEY`: AI 기능 활성화 시 사용
- `TAVILY_API_KEY`: 글로벌 검색 후보
- `NOMINATIM_USER_AGENT`: OSM Nominatim 호출 식별자
- `ADMIN_DELETE_SECRET`: 로컬 테스트 삭제용. 프로덕션에서는 비워 둡니다.
- `ADMIN_EMAILS`: 관리자 API 접근 허용 이메일 목록
- `SEARCH_PROVIDER`: 현재 기본값 `naver`
- `IMPORT_FORCE_NEWS`: 배치 스크립트에서 뉴스 소스를 강제로 켤 때 `1`

재난안전데이터망 주의사항:

- `SAFETYDATA_API_KEY`는 서버 전용입니다. `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
- 재난안전데이터망은 API 발급 내역의 `유저아이피`와 호출 환경의 공인 IP가 다르면 `UNREGISTERED IP ERROR`를 반환합니다.
- 이번 작업에서 로컬 실행 IP는 `1.212.1.126`으로 확인했고, `DSSP-IF-00103` 유저 IP를 이 값으로 변경한 뒤 `NORMAL SERVICE`가 반환되었습니다.
- 지진해일 대피지구는 `DSSP-IF-10164`로 시도했지만 기존 키에서는 `SERVICE ACCESS DENIED`가 나왔습니다. 별도 활용신청/승인이 필요합니다.

Feature flags:

- `FEATURE_USER_REGISTRATION`
- `FEATURE_NEWS_SEARCH`
- `FEATURE_WIKI_IMPORT`
- `FEATURE_AI_ENABLED`
- `FEATURE_TIMELINE`
- `FEATURE_MODERATION`
- `FEATURE_MEDIA_UPLOAD`
- `FEATURE_GLOBAL_MODE`

## 주요 폴더

- `app/`: Next.js App Router 페이지와 API Route Handlers
- `components/`: 지도, UI, 커뮤니티 컴포넌트
- `hooks/`: 지도/언어/Auth 관련 클라이언트 훅
- `lib/supabase/`: browser/server/admin Supabase client 분리
- `lib/sources/`: 뉴스/공공 CSV/TAAS 등 데이터 소스 어댑터
- `lib/import/`: 정규화 데이터 batch upsert 로직
- `lib/kakao/`, `lib/osm/`, `lib/search/`: 외부 API 래퍼
- `lib/disasters/`: 행정안전부 재난안전데이터망 응답 fetch/parse/normalize 로직
- `scripts/`: CLI 배치 스크립트
- `supabase/`: 현재 스키마와 마이그레이션 SQL
- `docs/`: 데이터 수집/CSV 스펙/서울 데이터 적재 순서 문서
- `.github/workflows/`: GitHub Actions 배치 적재 워크플로
- `.cursor/mcp.json`: Cursor MCP 설정. 토큰은 비밀값입니다.

재난 대피시설 관련 핵심 파일:

- `hooks/useTsunamiEvacuationStore.ts`: 재난 대피시설 레이어 store. `tsunami_evacuation_site,earthquake_outdoor_shelter` 두 카테고리를 묶어 `/api/public-safety/address-cache`에서 읽습니다.
- `components/ui/TsunamiEvacuationLayerToggle.tsx`: 사이드바 재난 대피시설 토글.
- `components/map/TsunamiEvacuationMarker.tsx`: 카카오맵 재난 대피시설 마커.
- `components/map/TsunamiEvacuationPopup.tsx`: 재난 대피시설 팝업. 긴 주소가 바깥으로 나가지 않도록 폭/줄바꿈이 보강되어 있습니다.
- `components/map/GlobalMapView.tsx`: English/Leaflet 지도에서도 재난 대피시설을 초록 원마커로 표시합니다.
- `app/api/public-safety/address-cache/route.ts`: 지도 레이어 공통 캐시 조회 API. 다중 category와 1000건 단위 페이지 조회를 지원합니다.
- `app/api/admin/disasters/earthquake-outdoor-shelter/sync/route.ts`: 관리자용 지진 옥외대피소 동기화 route.
- `app/api/admin/disasters/tsunami-evacuation/sync/route.ts`: 관리자용 지진해일 대피지구 동기화 route.
- `lib/disasters/safetydataEarthquakeOutdoorShelter.ts`: `DSSP-IF-00103` normalize. `XMAP_CRTS`/`YMAP_CRTS`/`GEOM` Web Mercator 좌표를 WGS84 위경도로 변환합니다.
- `lib/disasters/safetydataTsunamiEvacuation.ts`: 지진해일 대피지구 fetch/parse/normalize. 기본 endpoint는 `DSSP-IF-10164`입니다.
- `scripts/sync-earthquake-outdoor-shelter-api.ts`: `DSSP-IF-00103` 전체 동기화 CLI.
- `scripts/import-earthquake-outdoor-shelter-csv.ts`: CSV 대체 적재 CLI.
- `scripts/sync-tsunami-evacuation.ts`: 지진해일 대피지구 동기화 CLI.

## Supabase 구조

기본 스키마는 `supabase/schema.sql`, 추가 변경은 `supabase/migrations/*.sql`에 있습니다.

핵심 테이블:

- `profiles`: Supabase Auth `auth.users`와 1:1 공개 프로필
- `accidents`: 사고/범죄/뉴스/기타 지도 데이터. PostGIS `geography(Point, 4326)` 사용
- `import_raw`: 배치 수집 원본 스테이징
- `accident_sources`, `news_candidates`: 뉴스 후보/출처 관리
- `boards`, `posts`, `comments`, `post_votes`, `post_reports`: 커뮤니티 MVP
- `public_safety_address_cache`: 공공안전/재난 대피시설 지도 레이어 캐시. `category`, `source_type`, `source_record_key`, 주소, 시군구, `latitude`, `longitude`, `fetched_at` 등을 저장합니다.

중요한 DB 동작:

- `set_updated_at()` 트리거가 여러 테이블의 `updated_at`을 자동 갱신합니다.
- `sync_accident_location()` 트리거가 `lat`, `lng` 변경 시 `location`을 동기화합니다.
- `handle_new_user()` 트리거가 신규 Auth user 생성 시 `profiles` 행을 만듭니다.
- `accidents_in_bbox` RPC가 지도 bbox 조회에 사용됩니다.
- `accidents_source_external_uidx` 유니크 인덱스로 외부 데이터 재적재 시 중복을 방지합니다.
- `public_safety_address_cache`는 지도 표시를 위해 `latitude`/`longitude`가 있는 행만 `/api/public-safety/address-cache`에서 반환합니다.

운영 데이터 기준:

- `sex_offender_notice_address`: 성범죄자 공개/고지 주소 캐시. 정부24/공공데이터포털 OpenAPI 출처.
- `earthquake_outdoor_shelter`: 지진 옥외대피소. 현재 `safetydata_earthquake_outdoor_shelter` 2604건이 좌표 포함으로 들어가 있고, 과거 CSV 출처 100건 중 70건도 남아 있습니다.
- `tsunami_evacuation_site`: 지진해일 대피지구. 현재 운영 DB는 0건입니다. `DSSP-IF-10164` 별도 승인 후 동기화해야 합니다.

RLS 개요:

- `accidents` 조회는 공개입니다.
- 로그인 사용자는 자기 `created_by`로 `source_type='user'` 데이터를 생성/수정/삭제합니다.
- admin/moderator 작업 또는 배치 적재는 service role client를 사용합니다.
- service role client는 `lib/supabase/admin.ts`에만 두고 클라이언트 컴포넌트에서 import하지 않습니다.

## 주요 API

사고:

- `GET /api/accidents`: 사고 목록. `bbox`, `category`, `source`, `from`, `to`, `limit` 지원
- `POST /api/accidents`: 사고 등록. 로그인 사용자는 RLS 경로, 비로그인은 현재 Phase 1 호환으로 admin fallback
- `PATCH /api/accidents/:id`: 로그인 필요. admin/moderator는 전체 수정, 일반 사용자는 본인 글만
- `DELETE /api/accidents/:id`: 로그인 필요. `ADMIN_DELETE_SECRET` 헤더는 로컬 테스트용
- `POST /api/accidents/purge`: 테스트/관리성 삭제용 라우트

지도/검색:

- `GET /api/geocode`: 좌표 기반 주소 변환
- `GET /api/geocode/search`: 지명 검색
- `GET /api/kakao/keyword`: 카카오 키워드 검색 proxy
- `GET /api/public-safety/sex-offender-addresses`: 정부24 기반 공공안전 데이터
- `GET /api/public-safety/address-cache`: 공공안전/재난 대피시설 캐시 조회. `category`, `bbox`, `limit` 지원. `category`는 콤마 구분 다중값을 받을 수 있습니다.
- `POST /api/admin/public-safety/sync`: 관리자용 공공안전 주소 캐시 동기화
- `POST /api/admin/disasters/earthquake-outdoor-shelter/sync`: 관리자용 지진 옥외대피소 동기화
- `POST /api/admin/disasters/tsunami-evacuation/sync`: 관리자용 지진해일 대피지구 동기화

재난 대피시설 지도 조회 예시:

```text
/api/public-safety/address-cache?category=tsunami_evacuation_site,earthquake_outdoor_shelter&limit=5000
```

주의: Supabase/PostgREST는 1회 응답이 1000건으로 제한될 수 있으므로, 해당 route는 내부에서 1000건 단위 `range()` 조회를 반복합니다.

커뮤니티:

- `GET /api/boards`
- `GET /api/boards/:slug/posts`
- `GET /api/posts`, `POST /api/posts`
- `GET/PATCH/DELETE /api/posts/:id`
- `POST /api/posts/:id/comments`
- `POST /api/posts/:id/vote`
- `POST /api/posts/:id/report`
- `GET /api/community/home-preview`

Auth:

- `GET /auth/callback`: Supabase OAuth/PKCE 콜백
- `middleware.ts`: 페이지 요청에서 Supabase 세션 쿠키 갱신. `/api/*`는 제외합니다.

## 데이터 적재

권장 순서는 `docs/ingest-pipeline-order.md`를 따릅니다.

1. 서울 구 단위 집계 CSV 적재
2. 좌표가 있는 공공 사건 CSV 적재
3. 네이버 뉴스 검색 + 카카오 지오코딩으로 최근 데이터 보강

예시:

```bash
npm run import:batch -- --source=official --csv=docs/sample-seoul-aggregate.csv
npm run import:batch -- --source=news --keyword=서울화재 --region=서울 --limit=15 --from-year=2015 --to-year=2024
```

CSV 스펙은 `docs/csv-official-spec.md`, 샘플은 `docs/sample-official.csv`, `docs/sample-seoul-aggregate.csv`를 확인합니다.

### 재난 대피시설 적재

지진 옥외대피소 API:

- API명: `행정안전부_지진옥외대피소_포인트`
- Endpoint: `https://www.safetydata.go.kr/V2/api/DSSP-IF-00103`
- 인증 변수: `SAFETYDATA_API_KEY`
- 필수 파라미터: `serviceKey`, `returnType=json`, `pageNo`, `numOfRows`
- 포털 Python 샘플처럼 SSL 경고를 끄는 예제가 있습니다. Node fetch는 동작했고, Python 기본 SSL은 로컬 인증서 체인 때문에 실패할 수 있습니다.
- 실제 응답 구조: root에 `header`, `numOfRows`, `pageNo`, `totalCount`, `body` 배열이 옵니다.
- 운영 검증 당시 `totalCount=2604`였습니다.
- 좌표: `XMAP_CRTS`, `YMAP_CRTS`, `GEOM=POINT(x y)`는 WGS84 위경도가 아니라 Web Mercator(EPSG:3857)입니다. `lib/disasters/safetydataEarthquakeOutdoorShelter.ts`에서 WGS84로 변환합니다.

동기화 명령:

```bash
node --import tsx scripts/sync-earthquake-outdoor-shelter-api.ts --pages=14 --numOfRows=200
```

성공 기준:

```text
fetched=2604
upserted=2604
hadCoords=2604
geocodeFailed=0
```

Supabase 확인 SQL:

```sql
select category, source_type, source_name,
       count(*) as rows,
       count(latitude) as with_lat,
       count(longitude) as with_lng,
       max(fetched_at) as last_seen
from public_safety_address_cache
where category in ('earthquake_outdoor_shelter', 'tsunami_evacuation_site')
group by category, source_type, source_name
order by category, source_type;
```

운영 확인:

```bash
curl -fsSL 'https://accidentsbank.com/api/public-safety/address-cache?category=tsunami_evacuation_site,earthquake_outdoor_shelter&limit=5000'
```

지진해일 대피지구:

- 코드 기본 endpoint: `https://www.safetydata.go.kr/V2/api/DSSP-IF-10164`
- 현재 키로는 `SERVICE ACCESS DENIED`가 확인되었습니다.
- 재난안전데이터망에서 지진해일 대피지구 API를 별도 활용신청/승인한 뒤 `SAFETYDATA_TSUNAMI_API_URL`이 다르면 `.env.local`에 지정하고 `scripts/sync-tsunami-evacuation.ts`를 실행합니다.

GitHub Actions 배치:

- 파일: `.github/workflows/import-batch-cron.yml`
- 스케줄: 매주 월요일 04:00 UTC
- 수동 실행: `workflow_dispatch`로 `keyword`, `region` 입력
- 필요한 GitHub Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `KAKAO_REST_API_KEY`

## Vercel 배포

Vercel 프로젝트에는 아래를 맞춥니다.

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm ci`
- Output: Next.js 기본값
- Node.js: 프로젝트 설정 기준 24.x 또는 Vercel 지원 최신 LTS
- Production Branch: `main`
- Production/Preview/Development 환경변수는 `.env.local.example` 기준으로 등록

Supabase Auth를 쓰는 경우 Vercel 도메인을 Supabase Auth Redirect URL에 추가합니다.

- 앱 콜백: `https://<vercel-domain>/auth/callback`
- Supabase provider callback: `https://<project-ref>.supabase.co/auth/v1/callback`

운영 배포 흐름:

1. 작업 브랜치에서 커밋합니다. 최근 작업 브랜치는 `release/client-error-fixes`입니다.
2. GitHub PR을 `main` 대상으로 만듭니다.
3. PR을 머지하면 Vercel이 `main`을 자동 배포합니다.
4. 운영 API 또는 화면에서 반영을 확인합니다.

재난 대피시설 검증 URL:

```text
https://accidentsbank.com/api/public-safety/address-cache?category=tsunami_evacuation_site,earthquake_outdoor_shelter&limit=5000
```

최근 정상 기준은 `count=2674`입니다. 이 값은 `earthquake_outdoor_shelter` API 출처 2604건 + CSV 좌표 70건입니다. 지진해일 데이터가 추가되면 더 늘어납니다.

## MCP 설정

Cursor MCP 설정 파일은 `.cursor/mcp.json`입니다.

- 서버: `@supabase/mcp-server-supabase`
- 모드: `--read-only`
- 프로젝트 ref: `jfhkwnscplznhzloddko`
- features: `database,debugging,development,functions,storage,branching`

현재 Cursor 환경에서 확인된 MCP 서버:

- 이름: `project-0-사고관리앱-supabase`
- 용도: Supabase 테이블 조회, 운영 DB 상태 확인, 로그/어드바이저 확인
- 예: `public_safety_address_cache` 카테고리별 row/좌표 수 확인

주의:

- `SUPABASE_ACCESS_TOKEN`은 개인 비밀값입니다.
- CODEX나 다른 환경에 전달할 때는 토큰 값을 문서에 쓰지 말고, 해당 환경의 secret manager에 별도로 등록합니다.
- DB를 직접 변경하기 전에는 migration SQL을 만들고 리뷰합니다.
- 단순 운영 데이터 수 확인은 read-only SQL로 먼저 확인합니다.

## CODEX 작업 지침

CODEX에 처음 전달할 프롬프트 예시:

```text
이 저장소는 사고은행(Accidents Bank)입니다. Next.js 15 App Router + React 19 + TypeScript strict + Tailwind + Supabase(PostgreSQL/PostGIS/Auth) 기반입니다.

먼저 README.md, .env.local.example, package.json, supabase/schema.sql, supabase/migrations, app/api, lib/supabase, lib/import, lib/disasters, scripts, docs/ingest-pipeline-order.md를 읽고 맥락을 잡아 주세요.

비밀값은 절대 출력하거나 커밋하지 마세요. .env.local, Vercel env, GitHub Secrets, MCP SUPABASE_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY, SAFETYDATA_API_KEY, KAKAO_REST_API_KEY는 secret으로만 다룹니다.

브라우저 코드는 NEXT_PUBLIC_* 변수만 사용하고, SUPABASE_SERVICE_ROLE_KEY는 lib/supabase/admin.ts 및 서버/배치 코드에서만 사용해야 합니다.

재난 대피시설은 public_safety_address_cache를 통해 표시합니다. DSSP-IF-00103 XMAP_CRTS/YMAP_CRTS/GEOM은 Web Mercator(EPSG:3857)이므로 WGS84 위경도로 변환해야 합니다. 운영 확인 URL은 /api/public-safety/address-cache?category=tsunami_evacuation_site,earthquake_outdoor_shelter&limit=5000 입니다.

작업 후 npm run type-check와 npm run build를 우선 실행하고, lint는 Next.js 15/ESLint 9 설정 상태를 확인해 주세요.
```

개발 시 주의사항:

- 기존 파일의 한국어 UI 문구와 i18n 구조를 유지합니다.
- `@/*` path alias를 사용합니다.
- Supabase RLS를 우회해야 하는 작업은 서버 Route Handler, 배치 스크립트, admin client에서만 처리합니다.
- 지도 bbox 조회는 `/api/accidents`의 `accidents_in_bbox` RPC 흐름을 유지합니다.
- 외부 수집 데이터는 `external_source_id`를 안정적으로 만들어 upsert 중복을 피합니다.
- 공공안전/재난 대피시설 캐시는 `public_safety_address_cache`의 `source_type` + `source_record_key` 기준으로 중복을 피합니다.
- `DSSP-IF-00103`은 좌표가 많으므로 지도 API가 1000건 제한에 걸리지 않도록 `app/api/public-safety/address-cache/route.ts`의 페이지 조회를 유지합니다.
- 지진해일 `tsunami_evacuation_site`는 아직 운영 DB 0건입니다. `DSSP-IF-10164` 또는 실제 승인 endpoint 확인 후 별도 동기화가 필요합니다.
- `.next/`, `node_modules/`, `.env.local`은 문서/커밋 대상이 아닙니다.

## 로드맵

- [x] 프로젝트 환경 설정 및 카카오맵 렌더링
- [x] 지도 클릭 시 주소 추출 및 사고 등록 UI
- [x] Supabase 스키마, RLS, 트리거 적용
- [x] 커뮤니티 게시판 MVP
- [x] 공공 CSV/뉴스 배치 적재 기반
- [ ] AI 검색을 통한 과거 사고 자동 마이닝
- [ ] 관리자 검수/승인 화면
- [ ] 글로벌 모드 고도화
