-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pomodoros table
CREATE TABLE IF NOT EXISTS public.pomodoros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  type VARCHAR(10) CHECK (type IN ('work', 'break')),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create pomodoro_settings table
CREATE TABLE IF NOT EXISTS public.pomodoro_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  work_duration INTEGER DEFAULT 25,
  break_duration INTEGER DEFAULT 5,
  long_break_duration INTEGER DEFAULT 15,
  pomodoros_until_long_break INTEGER DEFAULT 4,
  auto_start_breaks BOOLEAN DEFAULT true,
  auto_start_pomodoros BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for pomodoros
ALTER TABLE public.pomodoros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pomodoros"
  ON public.pomodoros FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pomodoros"
  ON public.pomodoros FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pomodoros"
  ON public.pomodoros FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for pomodoro_settings
ALTER TABLE public.pomodoro_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pomodoro settings"
  ON public.pomodoro_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pomodoro settings"
  ON public.pomodoro_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pomodoro settings"
  ON public.pomodoro_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS pomodoros_user_id_idx ON public.pomodoros(user_id);