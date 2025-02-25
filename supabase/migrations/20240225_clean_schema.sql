-- First, drop all policies to start clean
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

-- Drop existing tables if they exist
DROP TABLE IF EXISTS flashcard_reviews CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS flashcard_decks CASCADE;

-- Create flashcard_decks table
CREATE TABLE flashcard_decks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create flashcards table with correct columns
CREATE TABLE flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    media JSONB[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    review_interval INTEGER DEFAULT 0,
    ease_factor FLOAT DEFAULT 2.5,
    repetitions INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    mastered BOOLEAN DEFAULT FALSE
);

-- Create flashcard_reviews table
CREATE TABLE flashcard_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    previous_interval INTEGER NOT NULL,
    new_interval INTEGER NOT NULL,
    previous_ease_factor FLOAT NOT NULL,
    new_ease_factor FLOAT NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for flashcard_decks
CREATE POLICY "Users can create their own decks"
    ON flashcard_decks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own decks"
    ON flashcard_decks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
    ON flashcard_decks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
    ON flashcard_decks FOR DELETE USING (auth.uid() = user_id);

-- Simple RLS policies for flashcards (using direct user_id from decks)
CREATE POLICY "Users can create flashcards in their decks"
    ON flashcards FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM flashcard_decks d 
        WHERE d.id = deck_id AND d.user_id = auth.uid()
    ));

CREATE POLICY "Users can view flashcards in their decks"
    ON flashcards FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM flashcard_decks d 
        WHERE d.id = deck_id AND d.user_id = auth.uid()
    ));

CREATE POLICY "Users can update flashcards in their decks"
    ON flashcards FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM flashcard_decks d 
        WHERE d.id = deck_id AND d.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete flashcards in their decks"
    ON flashcards FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM flashcard_decks d 
        WHERE d.id = deck_id AND d.user_id = auth.uid()
    ));

-- Simple RLS policies for flashcard_reviews
CREATE POLICY "Users can insert their own reviews"
    ON flashcard_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews"
    ON flashcard_reviews FOR SELECT USING (auth.uid() = user_id);

-- Function to get due cards
CREATE OR REPLACE FUNCTION get_due_cards(p_user_id UUID, p_deck_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    deck_id UUID,
    front_content TEXT,
    back_content TEXT,
    tags TEXT[],
    review_interval INTEGER,
    ease_factor FLOAT,
    repetitions INTEGER,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.deck_id, f.front_content, f.back_content, f.tags,
           f.review_interval, f.ease_factor, f.repetitions, f.last_reviewed, f.next_review
    FROM flashcards f
    JOIN flashcard_decks d ON f.deck_id = d.id
    WHERE d.user_id = p_user_id
    AND (p_deck_id IS NULL OR f.deck_id = p_deck_id)
    AND (f.next_review IS NULL OR f.next_review <= CURRENT_TIMESTAMP)
    AND NOT f.mastered
    ORDER BY f.next_review ASC NULLS FIRST, f.created_at ASC;
END;
$$;
