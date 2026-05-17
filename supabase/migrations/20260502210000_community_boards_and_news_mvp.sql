-- ============================================================================
-- Community MVP: boards / news / points (no changes to public.accidents)
-- idempotent: IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) accident_sources
CREATE TABLE IF NOT EXISTS public.accident_sources (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        text NOT NULL,
  name_i18n   jsonb NOT NULL DEFAULT '{}'::jsonb,
  kind        text NOT NULL DEFAULT 'media'
    CHECK (kind IN ('media', 'official', 'aggregator', 'user')),
  base_url    text,
  is_active   boolean NOT NULL DEFAULT true,
  status      text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  admin_notes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accident_sources_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS accident_sources_is_active_idx
  ON public.accident_sources (is_active)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS accident_sources_set_updated_at ON public.accident_sources;
CREATE TRIGGER accident_sources_set_updated_at
  BEFORE UPDATE ON public.accident_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 기본 출처 1건 (news_candidates 삽입 시 FK 충족용; 배치에서 추가 출처 등록 가능)
INSERT INTO public.accident_sources (code, name_i18n, kind, is_active, status)
VALUES (
  'unspecified',
  '{"ko":"미분류 출처","en":"Unspecified source"}'::jsonb,
  'aggregator',
  true,
  'active'
)
ON CONFLICT (code) DO NOTHING;

-- 2) news_candidates
CREATE TABLE IF NOT EXISTS public.news_candidates (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  accident_source_id  uuid NOT NULL
    REFERENCES public.accident_sources(id) ON DELETE RESTRICT,
  external_article_id text,
  title               text NOT NULL,
  summary_short       text,
  article_url         text,
  published_at        timestamptz,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'linked')),
  linked_accident_id  uuid
    REFERENCES public.accidents(id) ON DELETE SET NULL,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_notes         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_candidates_status_created_idx
  ON public.news_candidates (status, created_at DESC);
CREATE INDEX IF NOT EXISTS news_candidates_source_idx
  ON public.news_candidates (accident_source_id);
CREATE INDEX IF NOT EXISTS news_candidates_linked_accident_idx
  ON public.news_candidates (linked_accident_id)
  WHERE linked_accident_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS news_candidates_source_external_uidx
  ON public.news_candidates (accident_source_id, external_article_id)
  WHERE external_article_id IS NOT NULL AND length(trim(external_article_id)) > 0;

DROP TRIGGER IF EXISTS news_candidates_set_updated_at ON public.news_candidates;
CREATE TRIGGER news_candidates_set_updated_at
  BEFORE UPDATE ON public.news_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) boards
CREATE TABLE IF NOT EXISTS public.boards (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             text NOT NULL,
  name_i18n        jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order       int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'hidden')),
  admin_notes      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT boards_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS boards_active_sort_idx
  ON public.boards (is_active, sort_order)
  WHERE is_active = true AND status = 'active';

DROP TRIGGER IF EXISTS boards_set_updated_at ON public.boards;
CREATE TRIGGER boards_set_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) posts
CREATE TABLE IF NOT EXISTS public.posts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id            uuid NOT NULL
    REFERENCES public.boards(id) ON DELETE RESTRICT,
  author_id           uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type           text NOT NULL DEFAULT 'discussion'
    CHECK (post_type IN ('discussion', 'user_report', 'link', 'news_share')),
  title               text NOT NULL,
  body                text,
  body_excerpt        text,
  body_format         text NOT NULL DEFAULT 'plain'
    CHECK (body_format IN ('plain', 'markdown')),
  linked_accident_id  uuid
    REFERENCES public.accidents(id) ON DELETE SET NULL,
  news_candidate_id   uuid
    REFERENCES public.news_candidates(id) ON DELETE SET NULL,
  lat                 double precision,
  lng                 double precision,
  status              text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'draft')),
  is_blinded          boolean NOT NULL DEFAULT false,
  blind_reason        text,
  admin_notes         text,
  like_count          int NOT NULL DEFAULT 0,
  dislike_count       int NOT NULL DEFAULT 0,
  comment_count       int NOT NULL DEFAULT 0,
  report_count        int NOT NULL DEFAULT 0,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_lat_lng_pair_chk CHECK (
    (lat IS NULL AND lng IS NULL)
    OR (lat IS NOT NULL AND lng IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS posts_board_created_idx
  ON public.posts (board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_idx ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS posts_linked_accident_idx
  ON public.posts (linked_accident_id)
  WHERE linked_accident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_public_list_idx
  ON public.posts (status, is_blinded, created_at DESC);

DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) comments
CREATE TABLE IF NOT EXISTS public.comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     uuid NOT NULL
    REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id   uuid
    REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text NOT NULL,
  is_blinded  boolean NOT NULL DEFAULT false,
  status      text NOT NULL DEFAULT 'visible'
    CHECK (status IN ('visible', 'hidden')),
  admin_notes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_created_idx
  ON public.comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx
  ON public.comments (parent_id)
  WHERE parent_id IS NOT NULL;

DROP TRIGGER IF EXISTS comments_set_updated_at ON public.comments;
CREATE TRIGGER comments_set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) post_votes (PK = one vote per user per post)
CREATE TABLE IF NOT EXISTS public.post_votes (
  post_id    uuid NOT NULL
    REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  value      smallint NOT NULL
    CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_votes_user_idx ON public.post_votes (user_id);

-- 7) post_reports
CREATE TABLE IF NOT EXISTS public.post_reports (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id      uuid NOT NULL
    REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id  uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_code  text NOT NULL,
  detail       text,
  status       text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes  text,
  resolved_by  uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_reports_status_created_idx
  ON public.post_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS post_reports_post_idx ON public.post_reports (post_id);

-- 8) user_points_ledger (no client INSERT: no INSERT policy)
CREATE TABLE IF NOT EXISTS public.user_points_ledger (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta       integer NOT NULL,
  reason_code text NOT NULL,
  ref_type    text,
  ref_id      uuid,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_notes text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_points_ledger_user_created_idx
  ON public.user_points_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_points_ledger_reason_idx
  ON public.user_points_ledger (reason_code);

-- Staff helper for RLS (auth.uid is schema-qualified)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role IN ('moderator', 'admin')
  );
$$;

-- Seed: 6 default boards
INSERT INTO public.boards (slug, name_i18n, description_i18n, sort_order, is_active, status)
VALUES
  (
    'accident-report',
    '{"ko":"사고제보","en":"Accident reports"}'::jsonb,
    '{"ko":"사고 관련 제보 및 정보","en":"Accident-related reports"}'::jsonb,
    10,
    true,
    'active'
  ),
  (
    'crime-incident',
    '{"ko":"범죄/사건","en":"Crime & incidents"}'::jsonb,
    '{"ko":"범죄·사건 이야기","en":"Crime and incident discussion"}'::jsonb,
    20,
    true,
    'active'
  ),
  (
    'dashcam',
    '{"ko":"블랙박스","en":"Dashcam"}'::jsonb,
    '{"ko":"블랙박스·영상 관련","en":"Dashcam and video"}'::jsonb,
    30,
    true,
    'active'
  ),
  (
    'news-discussion',
    '{"ko":"뉴스토론","en":"News discussion"}'::jsonb,
    '{"ko":"뉴스·이슈 토론","en":"Discuss the news"}'::jsonb,
    40,
    true,
    'active'
  ),
  (
    'regional',
    '{"ko":"지역게시판","en":"Local"}'::jsonb,
    '{"ko":"지역 커뮤니티","en":"Local community"}'::jsonb,
    50,
    true,
    'active'
  ),
  (
    'free',
    '{"ko":"자유게시판","en":"Free board"}'::jsonb,
    '{"ko":"자유 주제","en":"General discussion"}'::jsonb,
    60,
    true,
    'active'
  )
ON CONFLICT (slug) DO NOTHING;

-- RLS
ALTER TABLE public.accident_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accident_sources_select_public" ON public.accident_sources;
CREATE POLICY "accident_sources_select_public"
  ON public.accident_sources FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "news_candidates_select_public" ON public.news_candidates;
CREATE POLICY "news_candidates_select_public"
  ON public.news_candidates FOR SELECT
  USING (
    status <> 'pending'
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "boards_select_active" ON public.boards;
CREATE POLICY "boards_select_active"
  ON public.boards FOR SELECT
  USING (
    (is_active = true AND status = 'active')
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "posts_select" ON public.posts;
CREATE POLICY "posts_select"
  ON public.posts FOR SELECT
  USING (
    (
      status = 'published'
      AND is_blinded = false
    )
    OR author_id = auth.uid()
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "posts_insert_authenticated" ON public.posts;
CREATE POLICY "posts_insert_authenticated"
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.boards AS b
      WHERE b.id = board_id
        AND b.is_active = true
        AND b.status = 'active'
    )
  );

DROP POLICY IF EXISTS "posts_update_own_or_staff" ON public.posts;
CREATE POLICY "posts_update_own_or_staff"
  ON public.posts FOR UPDATE
  USING (author_id = auth.uid() OR public.is_staff())
  WITH CHECK (author_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "posts_delete_own_or_staff" ON public.posts;
CREATE POLICY "posts_delete_own_or_staff"
  ON public.posts FOR DELETE
  USING (author_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  USING (
    public.is_staff()
    OR author_id = auth.uid()
    OR (
      is_blinded = false
      AND status = 'visible'
      AND EXISTS (
        SELECT 1
        FROM public.posts AS p
        WHERE p.id = comments.post_id
          AND (
            (
              p.status = 'published'
              AND p.is_blinded = false
            )
            OR p.author_id = auth.uid()
            OR public.is_staff()
          )
      )
    )
  );

DROP POLICY IF EXISTS "comments_insert_authenticated" ON public.comments;
CREATE POLICY "comments_insert_authenticated"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.posts AS p
      WHERE p.id = post_id
        AND (
          (
            p.status = 'published'
            AND p.is_blinded = false
          )
          OR p.author_id = auth.uid()
          OR public.is_staff()
        )
    )
  );

DROP POLICY IF EXISTS "comments_update_own_or_staff" ON public.comments;
CREATE POLICY "comments_update_own_or_staff"
  ON public.comments FOR UPDATE
  USING (author_id = auth.uid() OR public.is_staff())
  WITH CHECK (author_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "comments_delete_own_or_staff" ON public.comments;
CREATE POLICY "comments_delete_own_or_staff"
  ON public.comments FOR DELETE
  USING (author_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "post_votes_select_own" ON public.post_votes;
CREATE POLICY "post_votes_select_own"
  ON public.post_votes FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "post_votes_insert_own" ON public.post_votes;
CREATE POLICY "post_votes_insert_own"
  ON public.post_votes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.posts AS p
      WHERE p.id = post_id
        AND p.status = 'published'
        AND p.is_blinded = false
    )
  );

DROP POLICY IF EXISTS "post_votes_update_own" ON public.post_votes;
CREATE POLICY "post_votes_update_own"
  ON public.post_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.posts AS p
      WHERE p.id = post_id
        AND p.status = 'published'
        AND p.is_blinded = false
    )
  );

DROP POLICY IF EXISTS "post_votes_delete_own" ON public.post_votes;
CREATE POLICY "post_votes_delete_own"
  ON public.post_votes FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "post_reports_select" ON public.post_reports;
CREATE POLICY "post_reports_select"
  ON public.post_reports FOR SELECT
  USING (reporter_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS "post_reports_insert_authenticated" ON public.post_reports;
CREATE POLICY "post_reports_insert_authenticated"
  ON public.post_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reporter_id = auth.uid()
  );

DROP POLICY IF EXISTS "post_reports_update_staff" ON public.post_reports;
CREATE POLICY "post_reports_update_staff"
  ON public.post_reports FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "user_points_ledger_select_own" ON public.user_points_ledger;
CREATE POLICY "user_points_ledger_select_own"
  ON public.user_points_ledger FOR SELECT
  USING (user_id = auth.uid() OR public.is_staff());
