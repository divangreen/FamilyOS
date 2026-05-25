-- Migration: notifications expansion + create_notification RPC
-- Adds optional actor_name/post_title columns and a secure create_notification RPC

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'expert_review';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add optional columns for friendly UI
ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS post_title TEXT;

-- Create RPC to safely create notifications using public_posts view
CREATE OR REPLACE FUNCTION create_notification(
  p_post_id uuid,
  p_type notification_type,
  p_actor_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_is_ghost boolean;
  v_post_title text;
  v_notification_id uuid;
BEGIN
  -- Resolve the post author using the public_posts view (respects ghost privacy)
  SELECT author_id, is_ghost_post, title INTO v_recipient, v_is_ghost, v_post_title
  FROM public_posts
  WHERE id = p_post_id;

  IF v_recipient IS NULL THEN
    RETURN NULL; -- nothing to notify
  END IF;

  -- Avoid self-notifications
  IF p_actor_id IS NOT NULL AND p_actor_id = v_recipient THEN
    RETURN NULL;
  END IF;

  -- Mask actor_name if the post is a ghost post
  INSERT INTO notifications (recipient_id, actor_id, type, target_id, target_type, post_title)
  VALUES (v_recipient, p_actor_id, p_type, p_post_id, 'post', v_post_title)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION create_notification(uuid, notification_type, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_notification(uuid, notification_type, uuid) TO service_role;
