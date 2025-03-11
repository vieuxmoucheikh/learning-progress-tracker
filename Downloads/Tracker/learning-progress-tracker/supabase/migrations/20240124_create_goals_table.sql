-- Create the function to ensure the learning_goals table exists
create or replace function create_goals_table()
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the table exists
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'learning_goals') then
    -- Create the table
    create table public.learning_goals (
      id uuid default gen_random_uuid() primary key,
      user_id uuid references auth.users(id) on delete cascade not null,
      title text not null,
      category text not null,
      target_hours integer not null,
      target_date timestamp with time zone not null,
      priority text not null default 'medium',
      status text not null default 'active',
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now()
    );

    -- Set up RLS (Row Level Security)
    alter table public.learning_goals enable row level security;

    -- Create policies
    create policy "Users can view their own goals"
      on public.learning_goals for select
      using (auth.uid() = user_id);

    create policy "Users can insert their own goals"
      on public.learning_goals for insert
      with check (auth.uid() = user_id);

    create policy "Users can update their own goals"
      on public.learning_goals for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users can delete their own goals"
      on public.learning_goals for delete
      using (auth.uid() = user_id);

    -- Create indexes
    create index learning_goals_user_id_idx on public.learning_goals(user_id);
    create index learning_goals_category_idx on public.learning_goals(category);
    create index learning_goals_status_idx on public.learning_goals(status);
  end if;
end;
$$;
