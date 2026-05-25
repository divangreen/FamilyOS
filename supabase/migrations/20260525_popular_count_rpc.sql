-- Popular count increment/decrement RPCs for /api/votes/popular
CREATE OR REPLACE FUNCTION increment_popular_count(post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE posts SET popular_count = popular_count + 1 WHERE id = post_id;
$$;

CREATE OR REPLACE FUNCTION decrement_popular_count(post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE posts SET popular_count = GREATEST(popular_count - 1, 0) WHERE id = post_id;
$$;

REVOKE ALL ON FUNCTION increment_popular_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrement_popular_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_popular_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_popular_count(uuid) TO authenticated;
