-- Create storage policies for flashcard images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('flashcard-images', 'flashcard-images', true);

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'flashcard-images' AND 
  auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to select files
CREATE POLICY "Allow authenticated downloads" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'flashcard-images' AND 
  auth.role() = 'authenticated'
);

-- Policy to allow public access to files
CREATE POLICY "Allow public access" 
ON storage.objects 
FOR SELECT 
TO public 
USING (
  bucket_id = 'flashcard-images'
);

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'flashcard-images' AND 
  auth.role() = 'authenticated'
);
