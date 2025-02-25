-- Function to disable RLS
CREATE OR REPLACE FUNCTION disable_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    ALTER TABLE flashcard_decks DISABLE ROW LEVEL SECURITY;
    ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;
    ALTER TABLE flashcard_reviews DISABLE ROW LEVEL SECURITY;
END;
$$;

-- Function to enable RLS
CREATE OR REPLACE FUNCTION enable_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION disable_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION enable_rls() TO authenticated;
