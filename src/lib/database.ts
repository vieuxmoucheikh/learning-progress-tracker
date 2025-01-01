import { supabase } from './supabase'
import type { LearningItem, StreakData, LearningItemFormData, LearningGoal, Priority, GoalStatus, Session, Pomodoro, PomodoroSettings, PomodoroStats } from '../types'

// Learning Items
export const getLearningItems = async () => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('learning_items')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching learning items:', error);
      return [];
    } 
    
    return data || [];
  } catch (error) {
    console.error('Error in getLearningItems:', error);
    return [];
  }
}

const getAdjustedDateStr = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);  // Set to midnight in local timezone
  return d.toISOString().split('T')[0];
};

export async function addLearningItem(item: LearningItemFormData): Promise<LearningItem> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item data');
    }

    // Validate type field
    const validTypes = ['video', 'pdf', 'url', 'book', 'course', 'article'] as const;
    if (!validTypes.includes(item.type as typeof validTypes[number])) {
      throw new Error('Invalid item type');
    }

    // Create a clean database object
    const newItem = {
      title: (item.title || '').trim(),
      type: item.type as typeof validTypes[number],
      url: (item.url || '').trim(),
      notes: (item.notes || '').trim(),
      completed: Boolean(item.completed),
      category: (item.category || '').trim(),
      priority: (item.priority || 'medium') as 'low' | 'medium' | 'high',
      tags: Array.isArray(item.tags) ? item.tags.map(tag => (tag || '').trim()).filter(Boolean) : [],
      progress: {
        current: {
          hours: Math.max(0, parseInt(String(item.current?.hours || 0)) || 0),
          minutes: Math.max(0, parseInt(String(item.current?.minutes || 0)) || 0)
        },
        lastAccessed: new Date().toISOString(),
        sessions: []
      },
      date: item.date,  // Already formatted as YYYY-MM-DD
      difficulty: (item.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
      status: (item.status || 'not_started') as 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'archived',
      unit: (item.unit || 'hours') as 'hours' | 'pages' | 'percent',
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('learning_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('Error adding learning item:', error);
      throw new Error(error.message || 'Failed to add item');
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    return data as LearningItem;
  } catch (error) {
    console.error('Error in addLearningItem:', error);
    throw error instanceof Error ? error : new Error('Failed to add item');
  }
}

export async function updateLearningItem(id: string, updates: Partial<LearningItem>) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // If we're updating progress, ensure it's properly structured
    if (updates.progress) {
      const { data: currentItem } = await supabase
        .from('learning_items')
        .select('progress')
        .eq('id', id)
        .single();

      if (currentItem) {
        updates.progress = {
          ...currentItem.progress,
          ...updates.progress,
          // Don't concatenate sessions, use the provided sessions array
          sessions: updates.progress.sessions || currentItem.progress.sessions
        };
      }
    }

    const { data, error } = await supabase
      .from('learning_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating learning item:', error);
      throw new Error(error.message || 'Failed to update item');
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    return data as LearningItem;
  } catch (error) {
    console.error('Error in updateLearningItem:', error);
    throw error instanceof Error ? error : new Error('Failed to update item');
  }
}

export const deleteLearningItem = async (id: string) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { error } = await supabase
      .from('learning_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting learning item:', error)
      throw new Error(error.message || 'Failed to delete item')
    }
  } catch (error) {
    console.error('Error in deleteLearningItem:', error)
    throw error instanceof Error ? error : new Error('Failed to delete item')
  }
}

// Streak Data
export const getStreakData = async (userId: string) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    if (user.id !== userId) {
      throw new Error('Unauthorized access to streak data');
    }

    const { data, error } = await supabase
      .from('streak_data')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, create initial streak data
        return createInitialStreakData(userId)
      }
      console.error('Error fetching streak data:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getStreakData:', error)
    return null
  }
}

const createInitialStreakData = async (userId: string) => {
  try {
    const initialData = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      history: []
    }

    const { data, error } = await supabase
      .from('streak_data')
      .insert([initialData])
      .select()
      .single()

    if (error) {
      console.error('Error creating initial streak data:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createInitialStreakData:', error)
    return null
  }
}

export const updateStreakData = async (userId: string, streakData: Omit<StreakData, 'user_id'>) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    if (user.id !== userId) {
      throw new Error('Unauthorized access to streak data');
    }

    const { data, error } = await supabase
      .from('streak_data')
      .update(streakData)
      .eq('user_id', userId)
      .select()
    
    if (error) {
      console.error('Error updating streak data:', error)
      throw new Error(error.message || 'Failed to update streak data')
    }
    
    return data[0]
  } catch (error) {
    console.error('Error in updateStreakData:', error)
    throw error instanceof Error ? error : new Error('Failed to update streak data')
  }
}

export async function startSession(itemId: string, sessionData: { title?: string; description?: string }) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const now = new Date();
    const session = {
      startTime: now.toISOString(),
      date: now.toISOString(),
      title: sessionData.title,
      description: sessionData.description,
      status: 'in_progress',
      notes: []
    };

    const { data: item, error: getError } = await supabase
      .from('learning_items')
      .select('progress')
      .eq('id', itemId)
      .single();

    if (getError) {
      throw getError;
    }

    const progress = item.progress || { current: { hours: 0, minutes: 0 }, sessions: [] };
    progress.sessions = [...progress.sessions, session];

    const { error: updateError } = await supabase
      .from('learning_items')
      .update({
        progress,
        lastTimestamp: Date.now(),
        status: 'in_progress'
      })
      .eq('id', itemId);

    if (updateError) {
      throw updateError;
    }

    return session;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

export async function stopSession(itemId: string) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { data: item, error: getError } = await supabase
      .from('learning_items')
      .select('progress, lastTimestamp')
      .eq('id', itemId)
      .single();

    if (getError) {
      throw getError;
    }

    const now = new Date();
    const progress = item.progress;
    const lastSession = progress.sessions[progress.sessions.length - 1];
    
    if (lastSession && !lastSession.endTime) {
      const startTime = new Date(lastSession.startTime);
      const duration = calculateDuration(startTime, now);
      
      lastSession.endTime = now.toISOString();
      lastSession.duration = duration;
      lastSession.status = 'completed';

      // Update current progress
      progress.current.hours += duration.hours;
      progress.current.minutes += duration.minutes;
      if (progress.current.minutes >= 60) {
        progress.current.hours += Math.floor(progress.current.minutes / 60);
        progress.current.minutes = progress.current.minutes % 60;
      }
    }

    const { error: updateError } = await supabase
      .from('learning_items')
      .update({
        progress,
        lastTimestamp: null
      })
      .eq('id', itemId);

    if (updateError) {
      throw updateError;
    }

    return progress;
  } catch (error) {
    console.error('Error stopping session:', error);
    throw error;
  }
}

function calculateDuration(startTime: Date, endTime: Date) {
  const diffMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  return {
    hours: Math.floor(diffMinutes / 60),
    minutes: diffMinutes % 60
  };
}

// Goals
async function ensureGoalsTableExists() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Check if the table exists
    const { error: tableError } = await supabase
      .from('learning_goals')
      .select('id')
      .limit(1);

    if (tableError) {
      console.log('Goals table does not exist, creating...');
      
      // Create the table with the updated schema
      const { error: createError } = await supabase.rpc('create_goals_table');

      if (createError) {
        console.error('Error creating goals table:', createError);
        throw new Error('Failed to create goals table');
      }
    }
  } catch (error) {
    console.error('Error in ensureGoalsTableExists:', error);
    throw error;
  }
}

async function ensureSessionsTableExists() {
  try {
    const { data: exists } = await supabase
      .from('goal_sessions')
      .select('id')
      .limit(1);

    if (exists === null) {
      console.log('Sessions table does not exist, creating...');
      
      const { error: createError } = await supabase.rpc('create_sessions_table');

      if (createError) {
        console.error('Error creating sessions table:', createError);
        throw new Error('Failed to create sessions table');
      }
    }
  } catch (error) {
    console.error('Error in ensureSessionsTableExists:', error);
    throw error;
  }
}

async function ensurePomodoroTableExists() {
  try {
    const { error } = await supabase
      .from('pomodoros')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST204') {
      await supabase.rpc('create_pomodoro_table');
    }
  } catch (error) {
    console.error('Error in ensurePomodoroTableExists:', error);
  }
}

async function ensurePomodoroSettingsTableExists() {
  try {
    const { error } = await supabase
      .from('pomodoro_settings')
      .select('user_id')
      .limit(1);

    if (error && error.code === 'PGRST204') {
      await supabase.rpc('create_pomodoro_settings_table');
    }
  } catch (error) {
    console.error('Error in ensurePomodoroSettingsTableExists:', error);
  }
}

export async function initializeTables() {
  try {
    await ensureGoalsTableExists();
    await ensureSessionsTableExists();
    await ensurePomodoroTableExists();
    await ensurePomodoroSettingsTableExists();
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
}

// Pomodoro Management Functions
export async function startPomodoro(type: 'work' | 'break' | 'long_break' = 'work'): Promise<Pomodoro> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('pomodoros')
      .insert({
        user_id: user.data.user.id,
        start_time: new Date().toISOString(),
        type
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in startPomodoro:', error);
    throw error;
  }
}

export async function completePomodoro(pomodoroId: string): Promise<Pomodoro> {
  try {
    const { data, error } = await supabase
      .from('pomodoros')
      .update({
        end_time: new Date().toISOString(),
        completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', pomodoroId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in completePomodoro:', error);
    throw error;
  }
}

export async function getPomodoroStats(): Promise<PomodoroStats> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    // Get settings to access daily goal
    const settings = await getPomodoroSettings();

    // Get today's date at midnight in user's timezone
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000;
    const todayStart = new Date(today.getTime() - timezoneOffset);
    todayStart.setUTCHours(0, 0, 0, 0);

    // Get today's pomodoros
    const { data: todayPomodoros, error: todayError } = await supabase
      .from('pomodoros')
      .select('*')
      .eq('user_id', user.data.user.id)
      .gte('start_time', todayStart.toISOString());

    if (todayError) throw todayError;

    // Get all pomodoros for streak calculation
    const { data: allPomodoros, error: allError } = await supabase
      .from('pomodoros')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('start_time', { ascending: false });

    if (allError) throw allError;

    // Calculate total work minutes
    const totalWorkMinutes = todayPomodoros
      .filter(p => p.type === 'work' && p.completed)
      .reduce((acc, p) => {
        if (p.end_time && p.start_time) {
          const duration = (new Date(p.end_time).getTime() - new Date(p.start_time).getTime()) / (1000 * 60);
          return acc + duration;
        }
        return acc;
      }, 0);

    // Calculate daily completed pomodoros
    const daily_completed = todayPomodoros.filter(p => p.completed && p.type === 'work').length;
    const dailyGoalProgress = settings.daily_goal ? 
      Math.min((daily_completed / settings.daily_goal) * 100, 100) : 0;

    return {
      totalPomodoros: allPomodoros.length,
      completedPomodoros: allPomodoros.filter(p => p.completed).length,
      daily_completed,
      dailyGoalProgress,
      totalWorkMinutes: Math.round(totalWorkMinutes),
      totalBreakMinutes: Math.round(
        todayPomodoros
          .filter(p => (p.type === 'break' || p.type === 'long_break') && p.completed)
          .reduce((acc, p) => {
            if (p.end_time && p.start_time) {
              const duration = (new Date(p.end_time).getTime() - new Date(p.start_time).getTime()) / (1000 * 60);
              return acc + duration;
            }
            return acc;
          }, 0)
      ),
      currentStreak: calculateCurrentStreak(allPomodoros),
      longestStreak: calculateLongestStreak(allPomodoros),
      mostProductiveTime: calculateMostProductiveTime(allPomodoros),
      dailyAverage: calculateDailyAverage(allPomodoros)
    };
  } catch (error) {
    console.error('Error in getPomodoroStats:', error);
    throw error;
  }
}

function calculateMostProductiveTime(pomodoros: Pomodoro[]): string {
  if (pomodoros.length === 0) return 'N/A';

  const hourCounts = new Array(24).fill(0);
  pomodoros.forEach(p => {
    const hour = new Date(p.start_time).getHours();
    hourCounts[hour]++;
  });

  const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
  return `${maxHour.toString().padStart(2, '0')}:00`;
}

function calculateCurrentStreak(pomodoros: Pick<Pomodoro, 'start_time'>[]): number {
  if (pomodoros.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let currentStreak = 0;
  let currentDate = today;

  for (const pomodoro of pomodoros) {
    const pomodoroDate = new Date(pomodoro.start_time);
    pomodoroDate.setUTCHours(0, 0, 0, 0);

    if (currentDate.getTime() === pomodoroDate.getTime()) {
      currentStreak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
}

function calculateLongestStreak(pomodoros: Pick<Pomodoro, 'start_time'>[]): number {
  if (pomodoros.length === 0) return 0;

  let currentStreak = 1;
  let maxStreak = 1;
  let lastDate = new Date(pomodoros[0].start_time);
  lastDate.setUTCHours(0, 0, 0, 0);

  for (let i = 1; i < pomodoros.length; i++) {
    const currentDate = new Date(pomodoros[i].start_time);
    currentDate.setUTCHours(0, 0, 0, 0);

    const diffDays = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }

    lastDate = currentDate;
  }

  return maxStreak;
}

function calculateDailyAverage(pomodoros: Pomodoro[]): number {
  if (pomodoros.length === 0) return 0;
  
  const uniqueDays = new Set(
    pomodoros.map(p => new Date(p.start_time).toISOString().split('T')[0])
  );
  
  return Math.round(pomodoros.length / uniqueDays.size);
}

export async function getPomodoroSettings(): Promise<PomodoroSettings> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('pomodoro_settings')
      .select('*')
      .eq('user_id', user.data.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Settings don't exist, create default settings
      return createDefaultPomodoroSettings();
    }

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getPomodoroSettings:', error);
    throw error;
  }
}

export async function createDefaultPomodoroSettings(): Promise<PomodoroSettings> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('pomodoro_settings')
      .insert({
        user_id: user.data.user.id,
        work_duration: 25,
        break_duration: 5,
        long_break_duration: 15,
        pomodoros_until_long_break: 4,
        auto_start_breaks: true,
        auto_start_pomodoros: false,
        sound_enabled: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createDefaultPomodoroSettings:', error);
    throw error;
  }
}

export async function updatePomodoroSettings(settings: Partial<PomodoroSettings>): Promise<PomodoroSettings> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('pomodoro_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.data.user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updatePomodoroSettings:', error);
    throw error;
  }
}
