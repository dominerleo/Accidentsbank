-- 지도 bbox 조회에서 제목에 "테스트"가 포함된 행 제외 (개발용 샘플 숨김)
CREATE OR REPLACE FUNCTION public.accidents_in_bbox(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  source_filter text[] DEFAULT NULL,
  category_filter text[] DEFAULT NULL,
  from_date timestamptz DEFAULT NULL,
  to_date timestamptz DEFAULT NULL,
  result_limit int DEFAULT 1000
)
RETURNS SETOF public.accidents AS $$
  SELECT *
  FROM public.accidents
  WHERE public.ST_Intersects(
    location,
    public.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::public.geography
  )
  AND (source_filter IS NULL OR source_type = ANY(source_filter))
  AND (category_filter IS NULL OR category = ANY(category_filter))
  AND (from_date IS NULL OR occurred_at >= from_date)
  AND (to_date IS NULL OR occurred_at <= to_date)
  AND title NOT ILIKE '%테스트%'
  ORDER BY occurred_at DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE
SET search_path = '';
