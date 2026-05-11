-- ============================================================
-- Migration 002: generate_alias function + notifications table
-- ============================================================

-- Deterministic alias from a UUID seed.
-- Matches the wordlists in lib/wordlists.ts so server and client
-- produce the same output for the same seed.
CREATE OR REPLACE FUNCTION generate_alias(seed uuid)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  adjectives TEXT[] := ARRAY[
    'Quiet','Brave','Swift','Gentle','Bright','Calm','Bold','Wise','Kind','Warm',
    'Noble','Merry','Vivid','Serene','Tender','Witty','Nimble','Golden','Silver','Amber',
    'Crimson','Azure','Jade','Coral','Misty','Frosty','Sunny','Stormy','Verdant','Rustic',
    'Lunar','Solar','Cosmic','Mystic','Daring'
  ];
  animals TEXT[] := ARRAY[
    'Maple','Birch','Cedar','Willow','Aspen','Fox','Otter','Finch','Heron','Robin',
    'Lynx','Moose','Crane','Raven','Vole','Badger','Falcon','Kestrel','Marmot','Osprey',
    'Puffin','Quail','Salamander','Thrush','Weasel','Gecko','Ibis','Jackal','Kingfisher','Lemur',
    'Narwhal','Ocelot','Penguin','Quokka','Stoat'
  ];
  h      BIGINT;
  adj_n  INT;
  anim_n INT;
BEGIN
  -- XOR four 32-bit chunks of the UUID for uniform distribution
  h := (
    ('x' || substr(replace(seed::text, '-', ''),  1, 8))::bit(32)::bigint #
    ('x' || substr(replace(seed::text, '-', ''),  9, 8))::bit(32)::bigint #
    ('x' || substr(replace(seed::text, '-', ''), 17, 8))::bit(32)::bigint #
    ('x' || substr(replace(seed::text, '-', ''), 25, 8))::bit(32)::bigint
  );

  adj_n  := array_length(adjectives, 1);
  anim_n := array_length(animals, 1);

  RETURN adjectives[1 + (h % adj_n)::int]
      || animals   [1 + ((h / adj_n) % anim_n)::int]
      || (10 + (h % 90)::int)::text;
END;
$$;

-- ============================================================
-- Notifications
-- ============================================================

CREATE TYPE notification_type AS ENUM (
  'reply_post',
  'reply_comment',
  'helpful_vote',
  'expert_approved',
  'expert_rejected'
);

CREATE TABLE notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  type         notification_type NOT NULL,
  target_id    UUID        NOT NULL,
  target_type  target_type NOT NULL,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
-- Partial index makes unread-count queries cheap
CREATE INDEX idx_notifications_unread ON notifications (recipient_id)
  WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

-- Users can mark their own notifications as read (UPDATE read_at)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Inserts happen server-side via service role (bypasses RLS); no INSERT policy needed
