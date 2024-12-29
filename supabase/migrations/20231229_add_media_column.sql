-- Add media column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'enhanced_learning_cards'
        AND column_name = 'media'
    ) THEN 
        ALTER TABLE public.enhanced_learning_cards 
        ADD COLUMN media JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
