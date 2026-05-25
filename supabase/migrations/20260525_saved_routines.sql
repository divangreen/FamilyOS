CREATE TABLE IF NOT EXISTS saved_routines (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  input      jsonb,
  output     text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE saved_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_routines" ON saved_routines FOR ALL USING (auth.uid() = user_id);
