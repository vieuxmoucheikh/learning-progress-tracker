-- Create flashcards table
CREATE TABLE public.flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    next_review TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    interval INTEGER DEFAULT 0, -- Current interval in days
    ease_factor FLOAT DEFAULT 2.5, -- SuperMemo-2 ease factor
    repetitions INTEGER DEFAULT 0, -- Number of times reviewed
    last_reviewed TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    media JSONB DEFAULT '[]'::jsonb
);

-- Create flashcard decks table
CREATE TABLE public.flashcard_decks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    tags TEXT[] DEFAULT '{}'
);

-- Create review history table
CREATE TABLE public.flashcard_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5), -- SuperMemo-2 quality response
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    previous_interval INTEGER,
    new_interval INTEGER,
    previous_ease_factor FLOAT,
    new_ease_factor FLOAT
);

-- Create indexes
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX idx_flashcards_next_review ON public.flashcards(next_review);
CREATE INDEX idx_flashcard_decks_user_id ON public.flashcard_decks(user_id);
CREATE INDEX idx_flashcard_reviews_flashcard_id ON public.flashcard_reviews(flashcard_id);
CREATE INDEX idx_flashcard_reviews_user_id ON public.flashcard_reviews(user_id);

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for flashcards
CREATE POLICY "Users can view their own flashcards"
    ON public.flashcards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards"
    ON public.flashcards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
    ON public.flashcards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
    ON public.flashcards FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for decks
CREATE POLICY "Users can view their own decks"
    ON public.flashcard_decks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decks"
    ON public.flashcard_decks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
    ON public.flashcard_decks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
    ON public.flashcard_decks FOR DELETE
    USING (auth.uid() = user_id);

-- RLS policies for reviews
CREATE POLICY "Users can view their own reviews"
    ON public.flashcard_reviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews"
    ON public.flashcard_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Trigger for updating deck updated_at
CREATE OR REPLACE FUNCTION update_flashcard_deck_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcard_deck_updated_at
    BEFORE UPDATE ON public.flashcard_decks
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_deck_updated_at();
