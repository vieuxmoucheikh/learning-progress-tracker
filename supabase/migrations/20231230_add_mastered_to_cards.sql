-- Add mastered column to enhanced_learning_cards
ALTER TABLE enhanced_learning_cards
ADD COLUMN IF NOT EXISTS mastered BOOLEAN DEFAULT FALSE;

-- Update existing rows to have mastered = false
UPDATE enhanced_learning_cards
SET mastered = FALSE
WHERE mastered IS NULL;
