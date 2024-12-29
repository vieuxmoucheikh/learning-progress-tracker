-- Create enhanced learning cards table
create table if not exists public.enhanced_learning_cards (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    content text not null,
    tags text[] default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade not null
);

-- Enable RLS
alter table public.enhanced_learning_cards enable row level security;

-- Create policies
create policy "Users can view their own learning cards"
    on public.enhanced_learning_cards for select
    using (auth.uid() = user_id);

create policy "Users can insert their own learning cards"
    on public.enhanced_learning_cards for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own learning cards"
    on public.enhanced_learning_cards for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own learning cards"
    on public.enhanced_learning_cards for delete
    using (auth.uid() = user_id);

-- Create indexes
create index enhanced_learning_cards_user_id_idx on public.enhanced_learning_cards(user_id);
create index enhanced_learning_cards_updated_at_idx on public.enhanced_learning_cards(updated_at);
create index enhanced_learning_cards_tags_idx on public.enhanced_learning_cards using gin(tags);

-- Enable full-text search
alter table public.enhanced_learning_cards
    add column if not exists fts tsvector
    generated always as (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B')
    ) stored;

create index enhanced_learning_cards_fts_idx on public.enhanced_learning_cards using gin(fts);
