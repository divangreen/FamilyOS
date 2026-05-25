CREATE TABLE IF NOT EXISTS coach_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages    jsonb NOT NULL DEFAULT '[]',
  mood_score  integer CHECK (mood_score BETWEEN 1 AND 10),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_sessions_user_idx ON coach_sessions(user_id, updated_at DESC);

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_coach_sessions" ON coach_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature  text NOT NULL,
  used_at  date NOT NULL DEFAULT current_date,
  count    integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, feature, used_at)
);

CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid, p_feature text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO ai_usage(user_id, feature, used_at, count)
  VALUES (p_user_id, p_feature, current_date, 1)
  ON CONFLICT (user_id, feature, used_at)
  DO UPDATE SET count = ai_usage.count + 1;
$$;

REVOKE ALL ON FUNCTION increment_ai_usage(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_ai_usage(uuid, text) TO authenticated;
