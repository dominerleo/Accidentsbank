-- ============================================================================
-- 사고은행 (Accidents Bank) - Supabase DB 스키마
-- ----------------------------------------------------------------------------
-- 사용법:
--   1. Supabase 프로젝트 생성 (https://supabase.com)
--   2. 좌측 메뉴 SQL Editor 열기
--   3. 이 파일 내용 전체 복붙 후 [Run] 클릭
--   4. 에러 없이 실행되면 완료
--
-- 확장성 고려사항:
--   - source_type 은 enum 이 아닌 text → 새 출처 추가 시 스키마 변경 불필요
--   - metadata jsonb → 출처별 추가 정보 자유롭게 저장
--   - confidence/verified_by/tags/media_urls → 미래 기능 대비 미리 nullable 컬럼
-- ============================================================================

-- 1. 확장 활성화 -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. profiles 테이블 -------------------------------------------------------
-- auth.users 와 1:1 매핑되는 공개 프로필.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

-- 3. accidents 테이블 ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accidents (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 분류 정보
  category      text NOT NULL CHECK (category IN ('incident', 'crime', 'news', 'etc', 'misc')),
  title         text NOT NULL,
  description   text,

  -- 시간/위치 정보
  occurred_at   timestamptz NOT NULL,
  location      geography(Point, 4326) NOT NULL,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,

  -- 주소 정보 (카카오 좌표→주소 변환 결과)
  road_address  text,
  jibun_address text,
  region_1      text,
  region_2      text,
  region_3      text,

  -- 출처 정보 (확장 가능)
  source_type   text NOT NULL DEFAULT 'user',
  news_url      text,
  metadata      jsonb DEFAULT '{}'::jsonb,

  -- 미래 기능 대비 (nullable)
  confidence    numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  verified_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tags          text[] DEFAULT '{}',
  media_urls    text[] DEFAULT '{}',

  external_source_id text,

  -- 작성자
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 공간 인덱스 (PostGIS)
CREATE INDEX IF NOT EXISTS accidents_location_idx ON public.accidents USING GIST (location);

-- 일반 인덱스
CREATE INDEX IF NOT EXISTS accidents_occurred_at_idx ON public.accidents (occurred_at DESC);
CREATE INDEX IF NOT EXISTS accidents_source_type_idx ON public.accidents (source_type);
CREATE INDEX IF NOT EXISTS accidents_category_idx ON public.accidents (category);
CREATE INDEX IF NOT EXISTS accidents_created_by_idx ON public.accidents (created_by);
CREATE INDEX IF NOT EXISTS accidents_tags_idx ON public.accidents USING GIN (tags);

CREATE UNIQUE INDEX IF NOT EXISTS accidents_source_external_uidx
  ON public.accidents (source_type, external_source_id)
  WHERE external_source_id IS NOT NULL AND length(trim(external_source_id)) > 0;

-- 배치 수집 스테이징
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

-- 4. updated_at 자동 갱신 트리거 ------------------------------------------
-- 모든 함수는 search_path 를 '' 로 고정하여 search_path 하이재킹 방지.
-- 따라서 객체 참조는 모두 schema-qualified (public.*, pg_catalog.*) 로 작성한다.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS accidents_set_updated_at ON public.accidents;
CREATE TRIGGER accidents_set_updated_at
  BEFORE UPDATE ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. location 자동 동기화 (lat/lng → geography Point) ----------------------
CREATE OR REPLACE FUNCTION public.sync_accident_location()
RETURNS trigger AS $$
BEGIN
  NEW.location = public.ST_SetSRID(
    public.ST_MakePoint(NEW.lng, NEW.lat),
    4326
  )::public.geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS accidents_sync_location ON public.accidents;
CREATE TRIGGER accidents_sync_location
  BEFORE INSERT OR UPDATE OF lat, lng ON public.accidents
  FOR EACH ROW EXECUTE FUNCTION public.sync_accident_location();

-- 6. 신규 사용자 가입 시 profiles 자동 생성 -------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  final_username := base_username;

  -- 중복 시 suffix 부여
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || '_' || suffix;
  END LOOP;

  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- SECURITY DEFINER 함수는 anon/authenticated 가 RPC 로 직접 호출하면 안 됨.
-- (auth.users 트리거에서만 호출되어야 한다.)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. Row Level Security (RLS) ----------------------------------------------
-- ============================================================================

-- 7.1 profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7.2 accidents
ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;

-- 모든 사람 조회 가능 (공개 데이터)
DROP POLICY IF EXISTS "Accidents are viewable by everyone" ON public.accidents;
CREATE POLICY "Accidents are viewable by everyone"
  ON public.accidents FOR SELECT USING (true);

-- 로그인 사용자는 본인 명의로 등록 가능 (sourceType='user')
DROP POLICY IF EXISTS "Authenticated users can insert own accidents" ON public.accidents;
CREATE POLICY "Authenticated users can insert own accidents"
  ON public.accidents FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
    AND source_type = 'user'
  );

-- 본인 등록만 수정/삭제 가능 (단, moderator/admin 은 모두 가능)
DROP POLICY IF EXISTS "Users can update own accidents" ON public.accidents;
CREATE POLICY "Users can update own accidents"
  ON public.accidents FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can delete own accidents" ON public.accidents;
CREATE POLICY "Users can delete own accidents"
  ON public.accidents FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- ============================================================================
-- 8. 공간 검색 헬퍼 함수 (bbox 기반 조회) ----------------------------------
-- ============================================================================
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

-- ============================================================================
-- 완료. 다음 단계:
--   1. Authentication > Providers 에서 Email + Kakao + Google 활성화
--   2. .env.local 의 SUPABASE 변수 3개 채우기
--   3. 앱에서 /api/accidents 가 실제 DB 와 동작하는지 확인
-- ============================================================================
