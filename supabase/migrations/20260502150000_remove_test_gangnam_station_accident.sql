-- 테스트로 올린 강남역 사거리 관련 1건 삭제 (제목 일치)
DELETE FROM public.accidents
WHERE title = '테스트: 강남역 사거리 추돌';
