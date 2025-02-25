-- Create a new storage bucket for flashcard images
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('flashcards', 'flashcards', true, false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'flashcards');

-- Allow users to select their own images
CREATE POLICY "Allow users to view uploaded images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'flashcards');

-- Allow users to update their own images
CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'flashcards')
WITH CHECK (bucket_id = 'flashcards');

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'flashcards');

-- Allow public access to images (for sharing)
CREATE POLICY "Allow public access to images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'flashcards');
