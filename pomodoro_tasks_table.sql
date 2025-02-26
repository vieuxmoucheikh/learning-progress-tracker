CREATE TABLE IF NOT EXISTS public.pomodoro_tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  metrics JSONB DEFAULT '{\
totalMinutes\: 0, \completedPomodoros\: 0, \currentStreak\: 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies
ALTER TABLE public.pomodoro_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own tasks
CREATE POLICY select_own_tasks ON public.pomodoro_tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own tasks
CREATE POLICY insert_own_tasks ON public.pomodoro_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own tasks
CREATE POLICY update_own_tasks ON public.pomodoro_tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own tasks
CREATE POLICY delete_own_tasks ON public.pomodoro_tasks
  FOR DELETE USING (auth.uid() = user_id);
