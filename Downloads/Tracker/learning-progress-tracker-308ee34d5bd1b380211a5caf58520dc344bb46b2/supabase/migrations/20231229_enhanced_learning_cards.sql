-- Drop existing table if it exists
DROP TABLE IF EXISTS public.enhanced_learning_cards;

-- Create enhanced_learning_cards table
CREATE TABLE public.enhanced_learning_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    media JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create index for user_id for faster queries
CREATE INDEX idx_learning_cards_user_id ON public.enhanced_learning_cards(user_id);

-- Create index for tags for faster filtering
CREATE INDEX idx_learning_cards_tags ON public.enhanced_learning_cards USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.enhanced_learning_cards ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own cards
CREATE POLICY "Users can view their own cards"
    ON public.enhanced_learning_cards
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own cards
CREATE POLICY "Users can insert their own cards"
    ON public.enhanced_learning_cards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own cards
CREATE POLICY "Users can update their own cards"
    ON public.enhanced_learning_cards
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own cards
CREATE POLICY "Users can delete their own cards"
    ON public.enhanced_learning_cards
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_enhanced_learning_cards_updated_at ON public.enhanced_learning_cards;
CREATE TRIGGER update_enhanced_learning_cards_updated_at
    BEFORE UPDATE ON public.enhanced_learning_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
