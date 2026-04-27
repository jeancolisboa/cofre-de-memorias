-- Remove unique constraint on (user_id, date) to allow multiple memories per day
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_user_id_date_key;
