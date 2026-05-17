-- 카테고리 6종 → 4종 (incident, crime, news, etc)
-- 기존 DB에 적용 시 한 번만 실행.

ALTER TABLE public.accidents DROP CONSTRAINT IF EXISTS accidents_category_check;

UPDATE public.accidents
SET category = 'incident'
WHERE category IN ('traffic', 'fire', 'disaster');

UPDATE public.accidents
SET category = 'crime'
WHERE category IN ('crime', 'fraud');

UPDATE public.accidents
SET category = 'news'
WHERE source_type = 'news';

ALTER TABLE public.accidents
  ADD CONSTRAINT accidents_category_check
  CHECK (category IN ('incident', 'crime', 'news', 'etc'));
