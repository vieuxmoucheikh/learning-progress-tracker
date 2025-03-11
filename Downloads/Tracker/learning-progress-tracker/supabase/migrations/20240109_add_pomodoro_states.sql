-- Create pomodoro_states table
create table if not exists public.pomodoro_states (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    time integer not null,
    is_active boolean not null default false,
    is_break boolean not null default false,
    current_pomodoro_id uuid references public.pomodoros(id) on delete set null,
    last_update timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Add RLS policies
alter table public.pomodoro_states enable row level security;

create policy "Users can view their own pomodoro states"
    on public.pomodoro_states for select
    using (auth.uid() = user_id);

create policy "Users can insert their own pomodoro states"
    on public.pomodoro_states for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own pomodoro states"
    on public.pomodoro_states for update
    using (auth.uid() = user_id);

-- Add indexes
create index pomodoro_states_user_id_idx on public.pomodoro_states(user_id);
create index pomodoro_states_last_update_idx on public.pomodoro_states(last_update);

-- Add realtime
alter publication supabase_realtime add table pomodoro_states;

-- Add triggers for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_pomodoro_states_updated_at
    before update on public.pomodoro_states
    for each row
    execute procedure public.handle_updated_at();
