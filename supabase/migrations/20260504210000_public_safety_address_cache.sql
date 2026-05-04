-- ============================================================================
-- public_safety_address_cache
-- ----------------------------------------------------------------------------
-- 정부24·공공데이터 등 외부 공공안전 API에서 가져온 "주소 정보"와
-- 카카오 주소검색 API의 좌표 변환 결과를 캐싱하기 위한 테이블.
--
-- 저장 정책 (개인정보 보호):
--   - 이름, 사진, 상세 범죄내용, 원본 응답(raw_json)은 저장하지 않는다.
--   - 지도 표시용 displayAddress / latitude / longitude 와
--     출처(source_type, source_name), 수집 시각(fetched_at), 만료(expires_at)만 저장.
--
-- 분리 원칙:
--   - 기존 public.accidents 테이블과 분리해 운영한다.
--     accidents 는 사용자·뉴스·공식 사고 기록을 저장하고,
--     이 테이블은 "지도 표시용 주소 캐시"만 책임진다.
--
-- 적용 방법:
--   1) Supabase Dashboard > SQL Editor 에 이 파일 내용을 붙여 실행하거나
--   2) supabase CLI 가 연결돼 있다면 `supabase db push` 로 적용한다.
-- ============================================================================

-- 1. 테이블 ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_safety_address_cache (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 출처 식별
  source_type         text NOT NULL,
  source_name         text NOT NULL,
  source_record_key   text,
  category            text NOT NULL DEFAULT 'sex_offender_notice_address',

  -- 표시·검색용 주소 (개인정보 아님)
  display_address     text NOT NULL,
  address_for_geocoding text,
  sido                text,
  sigungu             text,
  eupmyeondong        text,
  ri                  text,

  -- 카카오 지오코딩 결과
  latitude            double precision,
  longitude           double precision,

  -- 캐시 수명 관리
  fetched_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.public_safety_address_cache IS
  '공공안전 API 주소 + 카카오 지오코딩 결과 캐시. 개인정보(이름·사진·상세 범죄내용)·원본 JSON 저장 금지.';
COMMENT ON COLUMN public.public_safety_address_cache.source_type IS
  '예: gov24, data_go_kr, mois 등. 새 출처 추가 시 스키마 변경 불필요.';
COMMENT ON COLUMN public.public_safety_address_cache.source_record_key IS
  '출처 측 고유 식별자(있는 경우). 같은 항목 재수집 시 중복 방지에 사용.';
COMMENT ON COLUMN public.public_safety_address_cache.category IS
  '캐시 항목의 분류 키. 기본값은 성범죄자 공개·고지 주소(sex_offender_notice_address).';
COMMENT ON COLUMN public.public_safety_address_cache.display_address IS
  '지도 표시·목록에 사용할 정규화 주소. 개인정보 아님.';
COMMENT ON COLUMN public.public_safety_address_cache.address_for_geocoding IS
  '카카오 주소검색 API에 전달했던 입력 주소 문자열.';

-- 2. 인덱스 ----------------------------------------------------------------
-- 출처+레코드 키로 중복 방지 (source_record_key 가 있는 경우)
CREATE UNIQUE INDEX IF NOT EXISTS public_safety_address_cache_source_record_uidx
  ON public.public_safety_address_cache (source_type, source_record_key)
  WHERE source_record_key IS NOT NULL
    AND length(trim(source_record_key)) > 0;

-- source_record_key 가 없는 경우를 위한 주소 hash 기반 중복 방지
-- 동일 출처에서 같은 카테고리·표시주소가 또 들어오면 한 행만 유지.
CREATE UNIQUE INDEX IF NOT EXISTS public_safety_address_cache_addr_hash_uidx
  ON public.public_safety_address_cache (
    source_type,
    category,
    md5(display_address)
  )
  WHERE source_record_key IS NULL
    OR length(trim(source_record_key)) = 0;

-- 좌표 / 만료 / 카테고리별 조회용 보조 인덱스
CREATE INDEX IF NOT EXISTS public_safety_address_cache_latlng_idx
  ON public.public_safety_address_cache (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_safety_address_cache_expires_idx
  ON public.public_safety_address_cache (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_safety_address_cache_category_idx
  ON public.public_safety_address_cache (category);

-- 3. updated_at 트리거 ------------------------------------------------------
-- 기존 schema.sql 에 정의된 public.set_updated_at() 함수를 재사용한다.
DROP TRIGGER IF EXISTS public_safety_address_cache_set_updated_at
  ON public.public_safety_address_cache;
CREATE TRIGGER public_safety_address_cache_set_updated_at
  BEFORE UPDATE ON public.public_safety_address_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS -------------------------------------------------------------------
ALTER TABLE public.public_safety_address_cache ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT: 지도 표시용이므로 누구나 조회 가능 (개인정보 컬럼이 없음)
DROP POLICY IF EXISTS "Public safety address cache is viewable by everyone"
  ON public.public_safety_address_cache;
CREATE POLICY "Public safety address cache is viewable by everyone"
  ON public.public_safety_address_cache
  FOR SELECT
  USING (true);

-- 4.2 INSERT/UPDATE/DELETE: 일반 사용자(anon/authenticated) 불가.
--   - 서버는 service_role 키로 접근 → RLS 우회되어 정상 동작.
--   - 관리자(profiles.role IN ('moderator','admin'))는 클라이언트에서도 가능하도록 허용.
DROP POLICY IF EXISTS "Staff can insert public safety address cache"
  ON public.public_safety_address_cache;
CREATE POLICY "Staff can insert public safety address cache"
  ON public.public_safety_address_cache
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff can update public safety address cache"
  ON public.public_safety_address_cache;
CREATE POLICY "Staff can update public safety address cache"
  ON public.public_safety_address_cache
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff can delete public safety address cache"
  ON public.public_safety_address_cache;
CREATE POLICY "Staff can delete public safety address cache"
  ON public.public_safety_address_cache
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );
