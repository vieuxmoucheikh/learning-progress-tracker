-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    title text NOT NULL,
    category text,
    target_hours integer NOT NULL,
    target_date timestamp with time zone NOT NULL,
    priority text CHECK (priority IN ('low', 'medium', 'high')),
    status text CHECK (status IN ('active', 'completed', 'overdue')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
    ON public.goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
    ON public.goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
    ON public.goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
    ON public.goals FOR DELETE
    USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX goals_user_id_idx ON public.goals(user_id);
CREATE INDEX goals_category_idx ON public.goals(category);
