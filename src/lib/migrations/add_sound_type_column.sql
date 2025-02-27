-- Add sound_type column to pomodoro_settings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pomodoro_settings'
        AND column_name = 'sound_type'
    ) THEN
        ALTER TABLE pomodoro_settings
        ADD COLUMN sound_type TEXT DEFAULT 'bell';
    END IF;
END $$;
