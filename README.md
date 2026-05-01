# 프로젝트명: 사고은행 (Accidents Bank)

## 1. 프로젝트 개요
전 세계의 사건사고 데이터를 체계적으로 기록하고, AI를 통해 과거의 기록을 탐색하는 '사건사고 데이터 저장소'입니다.
- **슬로건**: "우리 동네의 안전 기록, 사고은행이 기억합니다."
- **개발 전략**:
  1. 한국 서비스 우선 구축 (카카오맵 API 활용)
  2. 글로벌 확장 (Mapbox 기반 해외 버전 스위칭 구조 설계)

## 2. 주요 기능 (MVP)
### 2.1 지도 인터페이스 (한국 기준)
- **Kakao Maps API**: `react-kakao-maps-sdk` 기반 풀 스크린 지도.
- **정밀 주소 추출**: 지도 클릭 시 해당 지점의 법정동/지번/도로명 주소 자동 변환.
- **현장 로드뷰**: 사고 지점의 실제 거리 풍경을 카카오 로드뷰로 즉시 확인.

### 2.2 사고 기록 시스템
- **기록(Deposit)**: 사고 유형(교통, 강력범죄, 화재, 사기 등), 날짜, 내용, 뉴스 링크를 직접 등록.
- **시각화**: 사고 카테고리별 맞춤형 아이콘(`lucide-react`) 마커 표시.

### 2.3 AI 과거 데이터 탐색
- **AI 아카이빙**: 특정 좌표와 연도를 기반으로 AI가 과거 뉴스를 자동 검색·분석.
- **타임라인**: 연도별로 해당 지역에 어떤 사고들이 있었는지 시계열로 표시.

## 3. 기술 스택
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Map SDK**: `react-kakao-maps-sdk`
- **Icon**: `lucide-react`
- **Database**: Supabase (PostgreSQL + PostGIS)
- **AI**: OpenAI API (GPT-4o), Tavily Search API

## 4. 시작하기
```bash
npm install
cp .env.local.example .env.local
# .env.local 에 NEXT_PUBLIC_KAKAO_APP_KEY, KAKAO_REST_API_KEY 입력
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

## 5. 개발 로드맵
- [x] Step 1: 프로젝트 환경 설정 및 카카오맵 렌더링
- [x] Step 2: 지도 클릭 시 주소 추출 및 사고 등록 UI
- [x] Step 3: Supabase 연동 (스키마 + RLS + 트리거 적용 완료)
- [ ] Step 4: AI 검색을 통한 과거 사고 자동 마이닝
