-- Update flashcards table with spaced repetition fields
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS mastered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_review TIMESTAMP WITH TIME ZONE;

-- Make sure next_review can be null for mastered cards
ALTER TABLE flashcards 
ALTER COLUMN next_review DROP NOT NULL;

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

-- Enable Row Level Security
alter table flashcard_decks enable row level security;
alter table flashcards enable row level security;

-- Create policies for flashcard_decks
create policy "Users can view their own decks"
  on flashcard_decks
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own decks"
  on flashcard_decks
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own decks"
  on flashcard_decks
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own decks"
  on flashcard_decks
  for delete
  using (auth.uid() = user_id);

-- Create policies for flashcards
create policy "Users can view flashcards in their decks"
  on flashcards
  for select
  using (
    exists (
      select 1 from flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
      and flashcard_decks.user_id = auth.uid()
    )
  );

create policy "Users can create flashcards in their decks"
  on flashcards
  for insert
  with check (
    exists (
      select 1 from flashcard_decks
      where flashcard_decks.id = deck_id
      and flashcard_decks.user_id = auth.uid()
    )
  );

create policy "Users can update flashcards in their decks"
  on flashcards
  for update
  using (
    exists (
      select 1 from flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
      and flashcard_decks.user_id = auth.uid()
    )
  );

create policy "Users can delete flashcards in their decks"
  on flashcards
  for delete
  using (
    exists (
      select 1 from flashcard_decks
      where flashcard_decks.id = flashcards.deck_id
      and flashcard_decks.user_id = auth.uid()
    )
  );

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
