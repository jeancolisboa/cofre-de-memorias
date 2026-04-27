-- Add title column to memories table
ALTER TABLE memories ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '' NOT NULL;

-- Create index for better query performance on recent memories
CREATE INDEX IF NOT EXISTS idx_memories_date_title ON memories(date DESC, title);