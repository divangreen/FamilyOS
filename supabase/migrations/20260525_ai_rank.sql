ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_rank_score float DEFAULT 0.5;
CREATE INDEX IF NOT EXISTS posts_ai_rank_idx ON posts(ai_rank_score DESC);
