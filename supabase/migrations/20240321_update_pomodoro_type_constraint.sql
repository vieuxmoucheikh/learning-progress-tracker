-- Update pomodoros table type constraint
ALTER TABLE public.pomodoros 
DROP CONSTRAINT pomodoros_type_check;

ALTER TABLE public.pomodoros 
ADD CONSTRAINT pomodoros_type_check 
CHECK (type IN ('work', 'break', 'long_break'));
