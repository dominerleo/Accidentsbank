-- 분류 "기타" (DB 값 misc)
ALTER TABLE public.accidents DROP CONSTRAINT IF EXISTS accidents_category_check;

ALTER TABLE public.accidents
  ADD CONSTRAINT accidents_category_check
  CHECK (category IN ('incident', 'crime', 'news', 'etc', 'misc'));
