-- Enable the storage extension if not already enabled
create extension if not exists "storage";

-- Create a new bucket for flashcard images if it doesn't exist
insert into storage.buckets (id, name)
values ('flashcard_images', 'flashcard_images')
on conflict (id) do nothing;

-- Add storage policy to allow authenticated users to upload images
create policy "Users can upload flashcard images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'flashcard_images' 
  and owner = auth.uid()
);

-- Add storage policy to allow users to read their own images
create policy "Users can view their own flashcard images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'flashcard_images'
  and owner = auth.uid()
);

-- Add image_urls column to flashcards table
alter table flashcards
add column if not exists back_images text[] default '{}'::text[];

-- Add function to clean up storage when flashcard is deleted
create or replace function delete_flashcard_images()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Delete associated images from storage
  delete from storage.objects
  where bucket_id = 'flashcard_images'
  and path like 'flashcard_' || old.id || '_%';
  
  return old;
end;
$$;

-- Add trigger to clean up images when flashcard is deleted
create trigger cleanup_flashcard_images
before delete on flashcards
for each row
execute function delete_flashcard_images();
