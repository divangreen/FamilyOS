-- ============================================================
-- The Village — Initial Schema Migration
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE user_role AS ENUM ('mom', 'dad', 'guardian', 'expert', 'admin');
CREATE TYPE vote_type AS ENUM ('helpful', 'popular');
CREATE TYPE target_type AS ENUM ('post', 'comment');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'guardian',
  is_verified_expert BOOLEAN NOT NULL DEFAULT FALSE,
  cred_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sub_villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sub_villages (name, description) VALUES
  ('General', 'General parenting discussion'),
  ('Newborns', 'For parents of newborns (0–3 months)'),
  ('Toddlers', 'For parents of toddlers (1–3 years)'),
  ('School Age', 'For parents of school-age children'),
  ('Teens', 'For parents of teenagers'),
  ('Mental Health', 'Mental health support for parents'),
  ('Single Parents', 'Community for single parents');

CREATE TABLE ghost_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sub_village_id UUID NOT NULL REFERENCES sub_villages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_ghost_post BOOLEAN NOT NULL DEFAULT FALSE,
  ghost_alias_id UUID REFERENCES ghost_aliases(id) ON DELETE SET NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  popular_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  depth INT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 5),
  is_ghost_post BOOLEAN NOT NULL DEFAULT FALSE,
  ghost_alias_id UUID REFERENCES ghost_aliases(id) ON DELETE SET NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reputation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type target_type NOT NULL,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (voter_id, target_id, target_type)
);

CREATE TABLE expert_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  document_path TEXT NOT NULL,
  document_signed_url TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_posts_sub_village_created ON posts (sub_village_id, created_at DESC);
CREATE INDEX idx_posts_helpful ON posts (helpful_count DESC);
CREATE INDEX idx_posts_popular ON posts (popular_count DESC);
CREATE INDEX idx_comments_post_parent ON comments (post_id, parent_id, created_at);
CREATE INDEX idx_votes_target ON reputation_votes (target_id, target_type);
CREATE INDEX idx_votes_voter ON reputation_votes (voter_id);

ALTER TABLE posts ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) STORED;
CREATE INDEX idx_posts_fts ON posts USING GIN (search_vector);
CREATE INDEX idx_posts_title_trgm ON posts USING GIN (title gin_trgm_ops);

-- ============================================================
-- public_posts view
-- ============================================================

CREATE OR REPLACE VIEW public_posts AS
SELECT
  p.id,
  CASE WHEN p.is_ghost_post THEN NULL ELSE p.author_id END AS author_id,
  p.sub_village_id, p.title, p.body, p.is_ghost_post, p.ghost_alias_id,
  ga.alias_name, p.helpful_count, p.popular_count, p.created_at, p.updated_at,
  CASE WHEN p.is_ghost_post THEN NULL ELSE u.display_name END AS display_name,
  CASE WHEN p.is_ghost_post THEN NULL ELSE u.role END AS role,
  CASE WHEN p.is_ghost_post THEN NULL ELSE u.is_verified_expert END AS is_verified_expert,
  sv.name AS sub_village_name
FROM posts p
LEFT JOIN users u ON u.id = p.author_id
LEFT JOIN ghost_aliases ga ON ga.id = p.ghost_alias_id
LEFT JOIN sub_villages sv ON sv.id = p.sub_village_id;

-- ============================================================
-- Functions
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_helpful_count(p_target_id UUID, p_target_type target_type, p_delta INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_target_type = 'post' THEN
    UPDATE posts SET helpful_count = GREATEST(0, helpful_count + p_delta), updated_at = NOW() WHERE id = p_target_id;
  ELSIF p_target_type = 'comment' THEN
    UPDATE comments SET helpful_count = GREATEST(0, helpful_count + p_delta), updated_at = NOW() WHERE id = p_target_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO users (id, email, display_name, role)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'guardian'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_expert_applications_updated_at BEFORE UPDATE ON expert_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON users FOR SELECT USING (TRUE);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_trigger_only" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "sub_villages_select_all" ON sub_villages FOR SELECT USING (TRUE);
CREATE POLICY "sub_villages_admin_write" ON sub_villages FOR ALL USING (
  (auth.jwt() ->> 'role')::text = 'admin'
  OR (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin'
);

CREATE POLICY "ghost_aliases_select_own" ON ghost_aliases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ghost_aliases_select_admin" ON ghost_aliases FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');
CREATE POLICY "ghost_aliases_insert_own" ON ghost_aliases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_select_authenticated" ON posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_admin_all" ON posts FOR ALL USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

GRANT SELECT ON public_posts TO authenticated;

CREATE POLICY "comments_select_authenticated" ON comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "comments_insert_own" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "votes_select_own" ON reputation_votes FOR SELECT USING (auth.uid() = voter_id);
CREATE POLICY "votes_insert_own" ON reputation_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "votes_delete_own" ON reputation_votes FOR DELETE USING (auth.uid() = voter_id);

CREATE POLICY "expert_app_select_own" ON expert_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expert_app_select_admin" ON expert_applications FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');
CREATE POLICY "expert_app_insert_own" ON expert_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expert_app_update_admin" ON expert_applications FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');
