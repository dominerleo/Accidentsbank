# 사고은행 작업 계획

최종 업데이트: 2026-05-20

이 문서는 다른 Codex/Cursor 세션에서도 현재 맥락을 이어받기 위한 작업 계획입니다.

## 현재 기준

- 프로젝트 경로: `/Users/leopdsmac/Documents/Personal/사고관리앱`
- 운영 도메인: `https://accidentsbank.com`
- GitHub 저장소: `https://github.com/dominerleo/Accidentsbank.git`
- 기준 브랜치: `main`
- 배포 흐름: 로컬 검증 → `main` 커밋 → `git push origin main` → Vercel 자동 배포
- Vercel Production Branch: `main`
- Supabase project ref: `jfhkwnscplznhzloddko`

## 바로 이어서 할 일

1. 오른쪽 사이드바 접기/펼치기 기능을 운영에서 확인
   - 로컬 변경 파일: `components/ui/Sidebar.tsx`, `hooks/useSidebarStore.ts`
   - 검증 명령: `npm run type-check`, `npm run build`
   - 배포 후 `accidentsbank.com`에서 사이드바 닫기/열기 확인

2. 브랜치 단순화
   - 임시 작업 브랜치 내용을 `main`으로 합침
   - 앞으로는 큰 실험이 아닌 이상 `main` 하나로 작업
   - 오래된 임시 브랜치가 남아 있으면 정리

3. 문서 최신화 유지
   - `README.md`: 실제 운영/브랜치/배포 흐름 기준 문서
   - `docs/release-vercel.md`: Vercel 배포 체크리스트
   - `plan.md`: 다음 작업과 의사결정 기록

## 향후 기능/개선 계획

1. 지도 베이스를 MapTiler로 전환 검토 및 구현
   - 현재 한국어 모드는 Kakao Map, English 모드는 Leaflet/OpenStreetMap 중심
   - 목표: 지도 베이스를 MapTiler 중심으로 바꿔 한국/글로벌 지도 경험을 더 일관되게 관리
   - 확인할 것:
     - MapTiler 요금제와 무료 한도
     - API key 보관 방식 (`NEXT_PUBLIC_` 공개 키 여부 확인)
     - 기존 Kakao 주소 검색/역지오코딩 기능을 유지할지, MapTiler Geocoding으로 옮길지
     - 기존 사고/공공안전/재난 대피시설 마커 호환성
     - 모바일/데스크톱 성능
   - 구현 후보:
     - Leaflet 타일 provider를 MapTiler로 먼저 교체
     - 이후 Kakao Map 의존 기능을 단계적으로 분리

2. 지진해일 대피지구 데이터 동기화
   - 현재 `tsunami_evacuation_site` 운영 DB는 0건
   - `DSSP-IF-10164` 또는 data.go.kr 지진해일 긴급대피장소 API 승인 필요
   - 승인 후 `SAFETYDATA_API_KEY`, `SAFETYDATA_TSUNAMI_API_URL` 설정
   - `scripts/sync-tsunami-evacuation.ts` 실행 후 지도 표시 확인

3. 커뮤니티 MVP 운영 검증
   - 게시판 목록, 글쓰기, 상세, 댓글, 추천/비추천, 신고 흐름 확인
   - 로그인 필요 구간 UX 확인
   - Supabase RLS와 관리자 권한 점검

4. 공공안전/재난 레이어 운영 안정화
   - `public_safety_address_cache` 카운트와 좌표 포함 건수 주기 확인
   - `/api/public-safety/address-cache`의 1000건 페이지 조회 유지
   - 대량 마커 표시 시 성능 확인

5. 데이터 적재 자동화
   - GitHub Actions `import-batch-cron.yml` Secrets 설정 확인
   - 뉴스 배치 적재가 실제로 중복 없이 들어가는지 확인
   - 공식 CSV 적재 문서와 샘플 유지

6. AI 검색/분석 기능
   - `OPENAI_API_KEY`를 사용하는 Phase 3 기능은 아직 기본 비활성화
   - 비용이 발생하므로 기능 플래그와 사용량 제한 설계 후 진행

## 작업 원칙

- 비밀값은 커밋하지 않는다.
- `.env.local`, Vercel env, GitHub Secrets, MCP token, Supabase service role key는 문서에 실제 값으로 쓰지 않는다.
- 요청한 범위 외 리팩터링은 하지 않는다.
- 작업 후 최소 `npm run type-check`, `npm run build`를 실행한다.
