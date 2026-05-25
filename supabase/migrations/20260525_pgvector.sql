CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding vector(1024);
CREATE INDEX IF NOT EXISTS posts_embedding_ivfflat_idx
  ON posts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(1024),
  match_threshold float,
  match_count     int
)
RETURNS TABLE (
  id          uuid,
  title       text,
  body        text,
  author_role text,
  similarity  float
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.title, p.body, u.role AS author_role,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM posts p
  JOIN users u ON u.id = p.author_id
  WHERE p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
    AND (u.is_verified_expert = true OR u.role = 'expert')
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
