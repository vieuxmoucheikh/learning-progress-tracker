-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create an enum for item types
CREATE TYPE item_type AS ENUM ('video', 'pdf', 'url', 'book', 'course', 'article');

-- Create an enum for priority levels
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

-- Create an enum for difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create an enum for status
CREATE TYPE item_status AS ENUM ('not_started', 'in_progress', 'completed', 'on_hold', 'archived');

-- Create an enum for reminder frequency
CREATE TYPE reminder_frequency AS ENUM ('daily', 'weekly', 'custom');

-- Create the learning_items table
CREATE TABLE IF NOT EXISTS learning_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type item_type NOT NULL,
    progress JSONB NOT NULL DEFAULT '{
        "current": {"hours": 0, "minutes": 0},
        "sessions": []
    }',
    url TEXT,
    notes TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    category TEXT NOT NULL,
    priority priority_level NOT NULL DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    goal JSONB,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_timestamp BIGINT,
    difficulty difficulty_level NOT NULL DEFAULT 'medium',
    status item_status NOT NULL DEFAULT 'not_started',
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    reminders JSONB DEFAULT '{
        "enabled": false,
        "frequency": "weekly"
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index on user_id for faster queries
CREATE INDEX idx_learning_items_user_id ON learning_items(user_id);

-- Create an index on date for sorting
CREATE INDEX idx_learning_items_date ON learning_items(date);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_learning_items_updated_at
    BEFORE UPDATE ON learning_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE learning_items ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting items (users can only insert their own items)
CREATE POLICY "Users can insert their own items"
    ON learning_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy for selecting items (users can only view their own items)
CREATE POLICY "Users can view their own items"
    ON learning_items FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy for updating items (users can only update their own items)
CREATE POLICY "Users can update their own items"
    ON learning_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy for deleting items (users can only delete their own items)
CREATE POLICY "Users can delete their own items"
    ON learning_items FOR DELETE
    USING (auth.uid() = user_id);

-- Create streak_data table
CREATE TABLE IF NOT EXISTS streak_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    history JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on streak_data
ALTER TABLE streak_data ENABLE ROW LEVEL SECURITY;

-- Create policies for streak_data
CREATE POLICY "Users can insert their own streak data"
    ON streak_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own streak data"
    ON streak_data FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak data"
    ON streak_data FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create trigger for streak_data updated_at
CREATE TRIGGER update_streak_data_updated_at
    BEFORE UPDATE ON streak_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
