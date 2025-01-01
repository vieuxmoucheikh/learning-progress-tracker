-- Create learning_activity table
CREATE TABLE IF NOT EXISTS learning_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category, date)
);

-- Add RLS policies
ALTER TABLE learning_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning activity"
    ON learning_activity
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning activity"
    ON learning_activity
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning activity"
    ON learning_activity
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_learning_activity_updated_at
    BEFORE UPDATE ON learning_activity
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
