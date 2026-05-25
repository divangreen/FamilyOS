ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_flags jsonb DEFAULT '[]';

CREATE INDEX IF NOT EXISTS posts_flagged_idx ON posts(is_flagged) WHERE is_flagged = true;
