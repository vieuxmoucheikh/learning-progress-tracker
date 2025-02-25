-- Drop existing tables if they exist
DROP TABLE IF EXISTS flashcard_reviews;
DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS flashcard_decks;

-- Create flashcard_decks table
CREATE TABLE flashcard_decks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create flashcards table
CREATE TABLE flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    interval INTEGER DEFAULT 0,
    ease_factor DECIMAL DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create flashcard_reviews table
CREATE TABLE flashcard_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE NOT NULL,
    quality INTEGER NOT NULL CHECK (quality BETWEEN 1 AND 4),
    reviewed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own decks"
ON flashcard_decks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decks"
ON flashcard_decks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
ON flashcard_decks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
ON flashcard_decks FOR DELETE
USING (auth.uid() = user_id);

-- Flashcard policies
CREATE POLICY "Users can view their deck's flashcards"
ON flashcards FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert flashcards to their decks"
ON flashcards FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = deck_id
        AND flashcard_decks.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their deck's flashcards"
ON flashcards FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their deck's flashcards"
ON flashcards FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM flashcard_decks
        WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.user_id = auth.uid()
    )
);

-- Create indexes
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_flashcard_decks_updated_at
    BEFORE UPDATE ON flashcard_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get due cards
CREATE OR REPLACE FUNCTION get_due_cards(p_user_id UUID, p_deck_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    deck_id UUID,
    front_content TEXT,
    back_content TEXT,
    tags TEXT[],
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    review_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.deck_id, f.front_content, f.back_content, f.tags,
           f.last_reviewed, f.next_review, f.review_count
    FROM flashcards f
    JOIN flashcard_decks d ON f.deck_id = d.id
    WHERE d.user_id = p_user_id
    AND (p_deck_id IS NULL OR f.deck_id = p_deck_id)
    AND (f.next_review IS NULL OR f.next_review <= CURRENT_TIMESTAMP)
    ORDER BY f.next_review ASC NULLS FIRST, f.created_at ASC;
END;
$$;

-- Create function to delete a flashcard
CREATE OR REPLACE FUNCTION delete_flashcard(card_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM flashcards WHERE id = card_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to delete a deck and its flashcards
CREATE OR REPLACE FUNCTION delete_deck(deck_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM flashcards WHERE deck_id = deck_id;
  DELETE FROM flashcard_decks WHERE id = deck_id;
END;
$$ LANGUAGE plpgsql;

-- Add RPC permissions
GRANT EXECUTE ON FUNCTION delete_flashcard TO authenticated;
GRANT EXECUTE ON FUNCTION delete_deck TO authenticated;
