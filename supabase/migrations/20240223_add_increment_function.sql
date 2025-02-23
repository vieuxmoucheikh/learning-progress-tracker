-- Create function to increment repetitions
CREATE OR REPLACE FUNCTION increment_repetitions(flashcard_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_repetitions INTEGER;
BEGIN
  SELECT repetitions INTO current_repetitions
  FROM public.flashcards
  WHERE id = flashcard_id;

  RETURN COALESCE(current_repetitions, 0) + 1;
END;
$$;
