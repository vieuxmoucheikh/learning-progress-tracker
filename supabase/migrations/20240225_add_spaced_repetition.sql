-- Add spaced repetition columns to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS interval INTEGER,
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
