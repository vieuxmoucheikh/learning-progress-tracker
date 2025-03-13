-- First, disable RLS temporarily
ALTER TABLE flashcard_decks DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create their own decks" ON flashcard_decks;
DROP POLICY IF EXISTS "Users can view their own decks" ON flashcard_decks;
DROP POLICY IF EXISTS "Users can update their own decks" ON flashcard_decks;
DROP POLICY IF EXISTS "Users can delete their own decks" ON flashcard_decks;

DROP POLICY IF EXISTS "Users can create flashcards in their decks" ON flashcards;
DROP POLICY IF EXISTS "Users can view flashcards in their decks" ON flashcards;
DROP POLICY IF EXISTS "Users can update flashcards in their decks" ON flashcards;
DROP POLICY IF EXISTS "Users can delete flashcards in their decks" ON flashcards;

DROP POLICY IF EXISTS "Users can insert their own reviews" ON flashcard_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON flashcard_reviews;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_flashcard_decks_updated_at ON flashcard_decks;
DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
DROP TRIGGER IF EXISTS update_flashcard_reviews_updated_at ON flashcard_reviews;

-- Drop all trigger functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Re-enable RLS
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Create simple policies without any complex joins or conditions
CREATE POLICY "Users can create their own decks"
ON flashcard_decks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own decks"
ON flashcard_decks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
ON flashcard_decks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
ON flashcard_decks FOR DELETE
USING (auth.uid() = user_id);

-- Flashcard policies
CREATE POLICY "Users can create flashcards in their decks"
ON flashcards FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM flashcard_decks
    WHERE id = deck_id AND user_id = auth.uid()
));

CREATE POLICY "Users can view flashcards in their decks"
ON flashcards FOR SELECT
USING (EXISTS (
    SELECT 1 FROM flashcard_decks
    WHERE id = deck_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update flashcards in their decks"
ON flashcards FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM flashcard_decks
    WHERE id = deck_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete flashcards in their decks"
ON flashcards FOR DELETE
USING (EXISTS (
    SELECT 1 FROM flashcard_decks
    WHERE id = deck_id AND user_id = auth.uid()
));

-- Review policies
CREATE POLICY "Users can insert their own reviews"
ON flashcard_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews"
ON flashcard_reviews FOR SELECT
USING (auth.uid() = user_id);
