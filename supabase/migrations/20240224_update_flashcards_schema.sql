-- Create flashcard_decks table
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    tags TEXT[],
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    interval INTEGER DEFAULT 0,
    ease_factor DECIMAL DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Create policies for flashcard_decks
CREATE POLICY "Users can view their own decks"
    ON flashcard_decks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decks"
    ON flashcard_decks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
    ON flashcard_decks
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
    ON flashcard_decks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for flashcards
CREATE POLICY "Users can view flashcards in their decks"
    ON flashcards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_decks
            WHERE flashcard_decks.id = flashcards.deck_id
            AND flashcard_decks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create flashcards in their decks"
    ON flashcards
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM flashcard_decks
            WHERE flashcard_decks.id = deck_id
            AND flashcard_decks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update flashcards in their decks"
    ON flashcards
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_decks
            WHERE flashcard_decks.id = flashcards.deck_id
            AND flashcard_decks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete flashcards in their decks"
    ON flashcards
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM flashcard_decks
            WHERE flashcard_decks.id = flashcards.deck_id
            AND flashcard_decks.user_id = auth.uid()
        )
    );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_flashcard_decks_updated_at
    BEFORE UPDATE ON flashcard_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create flashcard_reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Add RLS policies for flashcard_reviews
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reviews"
    ON flashcard_reviews
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews"
    ON flashcard_reviews
    FOR SELECT
    USING (auth.uid() = user_id);

-- Function to get due cards
CREATE OR REPLACE FUNCTION get_due_cards(p_user_id UUID, p_deck_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    deck_id UUID,
    front_content TEXT,
    back_content TEXT,
    tags TEXT[],
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
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
