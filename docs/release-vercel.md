# Vercel Production Release Checklist

이 문서는 `accidentsbank.com` 운영 배포를 위한 체크리스트입니다.

## 0. 기준 경로

릴리스 기준 소스 경로:

```bash
cd "/Users/leopdsmac/Documents/Personal/사고관리앱"
```

로컬 dev 서버는 위 경로에서 실행합니다.

```bash
npm run dev
```

기준 브랜치는 `main`입니다. 혼자 작업하는 운영 방식이므로 로컬 검증 후 `main`에 커밋하고 GitHub에 push하면 Vercel이 자동 배포합니다.

## 1. 로컬 검증

릴리스 전 실행:

```bash
npm run build
npm run type-check
```

현재 확인 결과:

- `npm run build`: 통과
- `npm run type-check`: 통과

참고: `.next/types`가 오래된 경우 첫 `type-check`에서 누락 오류가 날 수 있습니다. `npm run build` 후 다시 실행하면 재생성됩니다.

## 2. Supabase 마이그레이션

공공안전 레이어는 `public.public_safety_address_cache` 테이블이 있어야 동작합니다.

현재 MCP 권한에서는 원격 DDL 적용이 read-only로 차단되어 직접 적용할 수 없습니다. Supabase Dashboard에서 아래 파일 내용을 실행하세요.

```text
supabase/migrations/20260504210000_public_safety_address_cache.sql
```

적용 위치:

1. Supabase Dashboard 접속
2. Project 선택
3. SQL Editor 이동
4. 위 migration SQL 전체 붙여넣기
5. Run 실행

적용 확인 SQL:

```sql
select to_regclass('public.public_safety_address_cache') as table_name;
```

정상 결과:

```text
public.public_safety_address_cache
```

캐시 현황 확인:

```sql
select
  count(*)::int as total,
  count(*) filter (where latitude is not null and longitude is not null)::int as with_coords,
  count(*) filter (where latitude is null or longitude is null)::int as without_coords
from public.public_safety_address_cache;
```

## 3. Vercel 프로젝트 설정

현재 운영 방식:

1. GitHub 저장소 `dominerleo/Accidentsbank`의 `main` 브랜치가 Vercel Production Branch입니다.
2. 로컬 `main`에서 작업을 커밋합니다.
3. `git push origin main`을 실행합니다.
4. Vercel이 자동으로 production 배포를 시작합니다.

프로젝트를 새로 연결해야 할 때의 설정:

1. GitHub에 현재 `main` 내용을 push
2. Vercel Dashboard 접속
3. Add New Project
4. GitHub repository 선택
5. Framework Preset: `Next.js`
6. Build Command: 기본값 `next build`
7. Install Command: 기본값 `npm install`
8. Output Directory: 비워둠

## 4. Vercel 환경변수

Vercel Project Settings → Environment Variables에 아래 값을 추가합니다.

### 필수, 클라이언트 공개

이 값들은 브라우저로 노출되어도 되는 publishable 값입니다.

```bash
NEXT_PUBLIC_KAKAO_APP_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_IS_KOREA=true
```

### 필수, 서버 전용

아래 값들은 절대 `NEXT_PUBLIC_` 접두어를 붙이지 마세요.

```bash
KAKAO_REST_API_KEY=...
GOV24_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=your-login-email@example.com
```

### 선택

```bash
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
OPENAI_API_KEY=...
TAVILY_API_KEY=...
NOMINATIM_USER_AGENT=AccidentsBank/1.0 (contact@example.com)
ADMIN_DELETE_SECRET=
NEXT_PUBLIC_ENABLE_DEV_DELETE=false
FEATURE_USER_REGISTRATION=true
FEATURE_NEWS_SEARCH=false
FEATURE_WIKI_IMPORT=false
FEATURE_AI_ENABLED=false
FEATURE_TIMELINE=false
FEATURE_MODERATION=false
FEATURE_MEDIA_UPLOAD=false
FEATURE_GLOBAL_MODE=false
SEARCH_PROVIDER=naver
IMPORT_FORCE_NEWS=1
```

## 5. Vercel 도메인 연결

Vercel Project → Settings → Domains에서 아래 도메인을 추가합니다.

```text
accidentsbank.com
www.accidentsbank.com
```

Vercel 화면에 표시되는 DNS 값을 가비아 DNS에 등록합니다. 일반적인 값은 다음과 같습니다.

```text
accidentsbank.com      A      76.76.21.21
www.accidentsbank.com  CNAME  cname.vercel-dns.com
```

중요: 실제로는 Vercel이 프로젝트 화면에 보여주는 값을 우선합니다.

## 6. 가비아 DNS 설정

가비아 My가비아 → DNS 관리 → `accidentsbank.com` DNS 레코드에 Vercel 안내값을 추가합니다.

기존에 같은 이름의 A/CNAME 레코드가 있으면 충돌하지 않도록 정리합니다.

DNS 전파는 보통 수 분에서 수 시간 걸릴 수 있습니다.

확인 명령:

```bash
dig accidentsbank.com
dig www.accidentsbank.com
```

## 7. Kakao Developers 설정

Kakao Developers → 내 애플리케이션 → 플랫폼 → Web에 아래 사이트 도메인을 추가합니다.

```text
https://accidentsbank.com
https://www.accidentsbank.com
http://localhost:3002
```

주의:

- `NEXT_PUBLIC_KAKAO_APP_KEY`는 JavaScript 키입니다.
- `KAKAO_REST_API_KEY`는 REST API 키이며 서버 전용입니다.
- 카카오 로그인 Redirect URI 설정 화면과 사이트 도메인 설정 화면은 서로 다릅니다.

## 8. Supabase Auth 설정

Supabase Dashboard → Authentication → URL Configuration:

Site URL:

```text
https://accidentsbank.com
```

Redirect URLs:

```text
https://accidentsbank.com/**
https://www.accidentsbank.com/**
http://localhost:3002/**
```

## 9. 배포 후 검증

### 기본

```text
https://accidentsbank.com
https://www.accidentsbank.com
```

확인:

- 홈 지도 로드
- 한국어/영어 탭 전환
- 카카오 지도 SDK 에러 없음
- Supabase 사고 목록 조회
- 로그인/로그아웃
- 사고 등록/수정/삭제

### 공공안전 관리자

관리자 이메일이 `ADMIN_EMAILS`에 포함되어 있어야 합니다.

```text
https://accidentsbank.com/admin/public-safety
```

확인:

- 비관리자 접근 차단
- 관리자 접근 가능
- 총 캐시 건수 표시
- 좌표 있는 항목/없는 항목 표시
- `정부 API에서 새로 가져오기` 실행
- 성공/실패 메시지 표시

### 공공안전 API

```text
https://accidentsbank.com/api/public-safety/address-cache?limit=3
```

정상 예:

```json
{
  "ok": true,
  "items": [],
  "count": 0
}
```

`items`가 비어 있어도 테이블이 적용되어 있으면 정상입니다. 데이터 표시는 관리자 페이지에서 동기화 후 확인합니다.

### 공공안전 지도 레이어

1. 홈 지도 접속
2. 우측 사이드바에서 `성범죄자 공개·고지 주소 정보` 확인
3. `지도 표시` 클릭
4. 보라색 마커 표시 확인
5. 팝업에 아래 항목만 표시되는지 확인
   - 분류
   - 위치: `displayAddress`
   - 출처
   - 갱신일

이름, 사진, 상세 범죄내용, 원본 JSON은 표시하지 않습니다.

## 10. 현재 남은 수동 작업

아래 작업은 계정 대시보드 권한이 필요해 직접 수행해야 합니다.

- Supabase SQL Editor에서 `public_safety_address_cache` 마이그레이션 실행
- Vercel 프로젝트 생성 또는 GitHub repository 연결
- Vercel 환경변수 입력
- Vercel Domains에 `accidentsbank.com`, `www.accidentsbank.com` 추가
- 가비아 DNS 레코드 입력
- Kakao Developers Web 도메인 추가
- Supabase Auth URL Configuration 업데이트

## 11. Supabase 보안 알림

현재 Supabase Security Advisor에서 다음 항목이 보입니다.

- `public.spatial_ref_sys` RLS 비활성화
- PostGIS 관련 함수가 public schema에 노출됨
- Auth leaked password protection 비활성화

이번 릴리스의 공공안전 기능과 직접 충돌하지는 않지만, 운영 전 Security Advisor에서 상세 내용을 확인하고 필요 시 별도 보안 정리 작업으로 처리하는 것을 권장합니다.
