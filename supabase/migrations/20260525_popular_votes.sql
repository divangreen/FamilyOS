-- Migration: popular_votes and popular_count on posts

-- Create popular_votes table
CREATE TABLE IF NOT EXISTS popular_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_popular_vote UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_popular_votes_post ON popular_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_popular_votes_user ON popular_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_popular_votes_created ON popular_votes(created_at DESC);

-- RLS
ALTER TABLE IF EXISTS popular_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can insert own votes"
  ON popular_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own votes"
  ON popular_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Everyone can view votes"
  ON popular_votes FOR SELECT
  TO authenticated
  USING (true);

-- Add popular_count column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS popular_count int DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_popular_count ON posts(popular_count DESC);

-- Function to adjust popular count
CREATE OR REPLACE FUNCTION adjust_popular_count(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts
  SET popular_count = (
    SELECT COUNT(*) FROM popular_votes WHERE post_id = p_post_id
  )
  WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_popular_count TO authenticated;

-- Recreate public_posts view to include popular_count
DROP VIEW IF EXISTS public_posts;
CREATE VIEW public_posts AS
SELECT 
  p.id,
  p.title,
  p.content,
  p.created_at,
  p.updated_at,
  p.helpful_count,
  p.popular_count,
  p.is_ghost_post,
  CASE 
    WHEN p.is_ghost_post THEN generate_alias(p.author_id)
    ELSE prof.display_name
  END as author_name,
  CASE 
    WHEN p.is_ghost_post THEN NULL
    ELSE p.author_id
  END as author_id
FROM posts p
LEFT JOIN profiles prof ON p.author_id = prof.id;

COMMENT ON VIEW public_posts IS 'Public view of posts with ghost post privacy protection and popular_count';
