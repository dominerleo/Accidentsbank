-- 배치 수집: 출처별 고유 ID로 upsert 중복 방지
ALTER TABLE public.accidents
  ADD COLUMN IF NOT EXISTS external_source_id text;

COMMENT ON COLUMN public.accidents.external_source_id IS
  '배치/외부 수집 시 출처 내 고유 ID (예: 기사 URL, 공공데이터 키). user 수동 등록은 NULL.';

-- PostgreSQL: UNIQUE 에서 NULL 은 서로 다른 값으로 취급되어 (user,NULL) 다중 행 허용
CREATE UNIQUE INDEX IF NOT EXISTS accidents_source_external_uidx
  ON public.accidents (source_type, external_source_id)
  WHERE external_source_id IS NOT NULL AND length(trim(external_source_id)) > 0;

-- 원시 수집 스테이징 (선택 경로: 검증 후 accidents 로 승격)
CREATE TABLE IF NOT EXISTS public.import_raw (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_type text NOT NULL,
  external_source_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS import_raw_status_created_idx
  ON public.import_raw (status, created_at DESC);

ALTER TABLE public.import_raw ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.import_raw IS
  '외부 수집 원시 payload. 서비스 롤로만 쓰기 권장.';
