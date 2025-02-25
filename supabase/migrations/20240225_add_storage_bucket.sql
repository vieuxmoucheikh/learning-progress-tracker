-- Create a new storage bucket for flashcard images
insert into storage.buckets (id, name, public)
values ('flashcards', 'flashcards', true);

-- Set up storage policies
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'flashcards' );

-- Allow authenticated users to upload files
create policy "Authenticated users can upload files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'flashcards'
  and owner = auth.uid()
);

-- Allow users to update and delete their own files
create policy "Users can update their own files"
on storage.objects for update
to authenticated
using ( bucket_id = 'flashcards' and owner = auth.uid() );

create policy "Users can delete their own files"
on storage.objects for delete
to authenticated
using ( bucket_id = 'flashcards' and owner = auth.uid() );
