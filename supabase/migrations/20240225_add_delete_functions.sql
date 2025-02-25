-- Function to delete a flashcard
CREATE OR REPLACE FUNCTION delete_flashcard(p_card_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM flashcards WHERE id = p_card_id;
END;
$$;

-- Function to delete a deck
CREATE OR REPLACE FUNCTION delete_deck(p_deck_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Flashcards will be deleted automatically due to ON DELETE CASCADE
    DELETE FROM flashcard_decks WHERE id = p_deck_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_flashcard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_deck(UUID) TO authenticated;
