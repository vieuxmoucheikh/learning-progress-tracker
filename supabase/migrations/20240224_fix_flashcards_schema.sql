-- Drop existing columns if they exist
ALTER TABLE flashcards
DROP COLUMN IF EXISTS review_interval,
DROP COLUMN IF EXISTS interval,
DROP COLUMN IF EXISTS ease_factor,
DROP COLUMN IF EXISTS repetitions,
DROP COLUMN IF EXISTS last_reviewed,
DROP COLUMN IF EXISTS next_review,
DROP COLUMN IF EXISTS mastered;

-- Add columns with correct names and types
ALTER TABLE flashcards
ADD COLUMN interval INTEGER DEFAULT 0,
ADD COLUMN ease_factor FLOAT DEFAULT 2.5,
ADD COLUMN repetitions INTEGER DEFAULT 0,
ADD COLUMN last_reviewed TIMESTAMP WITH TIME ZONE,
ADD COLUMN next_review TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN mastered BOOLEAN DEFAULT FALSE;
