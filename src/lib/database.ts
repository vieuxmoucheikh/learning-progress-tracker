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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    console.log('Updating learning item:', { id, updates });

    const { data, error } = await supabase
      .from('learning_items')
      .update({
        ...updates,
        updated_at: new Date('2025-01-02T23:38:16+01:00').toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating learning item:', error);
      return null;
    }

    console.log('Learning item updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in updateLearningItem:', error);
    return null;
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

export async function getGoals() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { data: goals, error: goalsError } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', user.id);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      throw new Error(goalsError.message || 'Failed to fetch goals');
    }

    // Fetch sessions for each goal
    const goalsWithSessions = await Promise.all(goals.map(async (goal) => {
      const sessions = await getSessions(goal.id);
      return {
        id: goal.id,
        userId: goal.user_id,
        title: goal.title,
        category: goal.category,
        targetHours: goal.target_hours,
        targetDate: goal.target_date,
        priority: goal.priority,
        status: goal.status,
        createdAt: goal.created_at,
        progress: { sessions }
      };
    }));

    return goalsWithSessions;
  } catch (error) {
    console.error('Error in getGoals:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch goals');
  }
}

export async function addGoal(goal: Omit<LearningGoal, 'id' | 'userId' | 'createdAt' | 'status'>) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Convert property names for database
    const { targetHours, targetDate, ...rest } = goal;
    const newGoal = {
      ...rest,
      user_id: user.id,
      target_hours: targetHours,
      target_date: targetDate,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedGoal, error: insertError } = await supabase
      .from('learning_goals')
      .insert([newGoal])
      .select()
      .single();

    if (insertError) {
      console.error('Error adding goal:', insertError);
      throw new Error(insertError.message || 'Failed to add goal');
    }

    if (!insertedGoal) {
      throw new Error('No data returned from insert');
    }

    // Transform the data to match the LearningGoal interface
    return {
      id: insertedGoal.id,
      userId: insertedGoal.user_id,
      title: insertedGoal.title,
      category: insertedGoal.category,
      targetHours: insertedGoal.target_hours,
      targetDate: insertedGoal.target_date,
      priority: insertedGoal.priority,
      status: insertedGoal.status,
      createdAt: insertedGoal.created_at,
      progress: { sessions: [] }  // Initialize with empty sessions
    };
  } catch (error) {
    console.error('Error in addGoal:', error);
    throw error instanceof Error ? error : new Error('Failed to add goal');
  }
}

export async function updateGoal(id: string, updates: Partial<LearningGoal>) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Remove progress from updates and convert property names
    const { progress, targetHours, targetDate, ...rest } = updates;
    const updatedData = {
      ...rest,
      ...(targetHours !== undefined && { target_hours: targetHours }),
      ...(targetDate !== undefined && { target_date: targetDate }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('learning_goals')
      .update(updatedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal:', error);
      throw new Error(error.message || 'Failed to update goal');
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    // Transform the data back to match the LearningGoal interface
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      category: data.category,
      targetHours: data.target_hours,
      targetDate: data.target_date,
      priority: data.priority,
      status: data.status,
      createdAt: data.created_at,
      progress: { sessions: [] }
    };
  } catch (error) {
    console.error('Error in updateGoal:', error);
    throw error instanceof Error ? error : new Error('Failed to update goal');
  }
}

export async function deleteGoal(id: string) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { error } = await supabase
      .from('learning_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting goal:', error);
      throw new Error(error.message || 'Failed to delete goal');
    }
  } catch (error) {
    console.error('Error in deleteGoal:', error);
    throw error instanceof Error ? error : new Error('Failed to delete goal');
  }
}

export async function addSession(goalId: string, sessionData: { date: string; duration: { hours: number; minutes: number }; notes?: string }): Promise<Session> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication required');
    }

    // Validate input
    if (!sessionData.date || !sessionData.duration) {
      throw new Error('Invalid session data: date and duration are required');
    }

    if (typeof sessionData.duration.hours !== 'number' || typeof sessionData.duration.minutes !== 'number') {
      throw new Error('Invalid duration format');
    }

    // Convert local date string to UTC date for storage
    const localDate = new Date(sessionData.date);
    if (isNaN(localDate.getTime())) {
      throw new Error('Invalid date format');
    }
    const utcDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
    const currentTime = new Date().toISOString();

    const { data: session, error } = await supabase
      .from('goal_sessions')
      .insert([
        {
          goal_id: goalId,
          user_id: user.id,
          date: utcDate.toISOString(),
          startTime: currentTime, // Ajout de la propriété startTime
          duration: {
            hours: Math.max(0, Math.floor(sessionData.duration.hours)),
            minutes: Math.max(0, Math.min(59, Math.floor(sessionData.duration.minutes)))
          },
          notes: sessionData.notes || '',
          status: 'completed' // Par défaut, les sessions ajoutées manuellement sont complétées
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding session:', error);
      throw error;
    }

    if (!session) {
      throw new Error('Failed to create session');
    }

    // Convert UTC date back to local date string for response
    const sessionUtcDate = new Date(session.date);
    const sessionLocalDate = new Date(sessionUtcDate.getTime() - sessionUtcDate.getTimezoneOffset() * 60000);
    const dateStr = sessionLocalDate.toISOString().split('T')[0];

    return {
      id: session.id,
      goal_id: session.goal_id,
      user_id: session.user_id,
      date: dateStr,
      startTime: session.startTime || currentTime, // Assurer que startTime existe
      duration: {
        hours: session.duration.hours,
        minutes: session.duration.minutes
      },
      status: session.status || 'completed',
      notes: session.notes || '',
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  } catch (error) {
    console.error('Error in addSession:', error);
    throw error;
  }
}

export async function getSessions(goalId: string): Promise<Session[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Authentication required');
    }

    const { data: sessions, error } = await supabase
      .from('goal_sessions')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }

    if (!sessions) {
      console.log('No sessions found for goal:', goalId);
      return [];
    }

    // Add explicit type annotation to the session parameter
    return sessions.map((session: {
      id: string;
      goal_id: string;
      user_id: string;
      date: string;
      startTime?: string;
      duration?: { hours?: number; minutes?: number };
      notes?: string;
      created_at: string;
      updated_at: string;
      status?: 'in_progress' | 'completed' | 'on_hold';
    }) => {
      // Convert UTC date to local date string (YYYY-MM-DD)
      const utcDate = new Date(session.date);
      const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
      const dateStr = localDate.toISOString().split('T')[0];
      
      // Assurer que startTime existe (utiliser created_at comme fallback)
      const startTime = session.startTime || session.created_at || utcDate.toISOString();

      return {
        id: session.id,
        goal_id: session.goal_id,
        user_id: session.user_id,
        date: dateStr,
        startTime: startTime,
        duration: {
          hours: session.duration?.hours || 0,
          minutes: session.duration?.minutes || 0
        },
        status: session.status || 'completed',
        notes: session.notes || '',
        created_at: session.created_at,
        updated_at: session.updated_at
      };
    });
  } catch (error) {
    console.error('Error in getSessions:', error);
    throw error;
  }
}

// Learning activity tracking
export async function createLearningActivityTable() {
  const { error } = await supabase.rpc('create_learning_activity_table');
  if (error) console.error('Error creating learning activity table:', error);
}

export async function trackLearningActivity(category: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found for tracking activity');
      return null;
    }

    const currentDate = new Date();
    const dateStr = currentDate.toISOString().split('T')[0];

    console.log('Tracking activity:', { 
      category, 
      dateStr, 
      userId: user.id,
      currentDate: currentDate.toISOString()
    });

    // First check if we already have an entry for this date and category
    const { data: existing, error: selectError } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('date', dateStr)
      .single();
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing activity:', selectError);
      throw selectError;
    }

    if (existing) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('learning_activity')
        .update({
          count: existing.count + 1,
          updated_at: currentDate.toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) {
        console.error('Error updating activity:', updateError);
        throw updateError;
      }

      return updated;
    } else {
      // Create new record
      const { data: created, error: insertError } = await supabase
        .from('learning_activity')
        .insert([{
          user_id: user.id,
          category,
          date: dateStr,
          count: 1,
          created_at: currentDate.toISOString(),
          updated_at: currentDate.toISOString()
        }])
        .select()
        .single();
      if (insertError) {
        console.error('Error creating activity:', insertError);
        throw insertError;
      }

      return created;
    }
  } catch (error) {
    console.error('Error tracking learning activity:', error);
    return null;
  }
}

export async function getYearlyActivity(category: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found for getting yearly activity');
      return [];
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('Fetching activity for:', {
      category,
      year,
      startDateStr,
      endDateStr,
      userId: user.id,
      currentDate: currentDate.toISOString()
    });

    // First get all activities for this category
    const { data: activities, error } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .gte('date', startDateStr)
      .lte('date', endDateStr);
    if (error) {
      console.error('Error fetching yearly activity:', error);
      return [];
    }

    console.log('Raw activity data from database:', activities);

    // Fill in missing dates with zero counts
    const filledData = [];
    let currentDatePointer = new Date(startDate);
    currentDatePointer.setUTCHours(0, 0, 0, 0);
    const endDateTime = endDate.getTime();
    while (currentDatePointer.getTime() <= endDateTime) {
      const dateStr = currentDatePointer.toISOString().split('T')[0];
      const existingData = activities?.find(d => d.date === dateStr);
      
      if (existingData) {
        console.log('Found activity for date:', dateStr, existingData);
        filledData.push({
          ...existingData,
          dayOfWeek: currentDatePointer.getDay()
        });
      } else {
        filledData.push({
          id: `temp-${dateStr}`,
          user_id: user.id,
          category,
          date: dateStr,
          count: 0,
          created_at: currentDate.toISOString(),
          updated_at: currentDate.toISOString(),
          dayOfWeek: currentDatePointer.getDay()
        });
      }

      currentDatePointer.setDate(currentDatePointer.getDate() + 1);
    }

    const activeDays = filledData.filter(d => d.count > 0);
    console.log('Found active days:', {
      total: activeDays.length,
      days: activeDays.map(d => ({ date: d.date, count: d.count }))
    });

    return filledData;
  } catch (error) {
    console.error('Error in getYearlyActivity:', error);
    return [];
  }
}

export async function addTestActivityData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date();
    const testData = [];

    // Add some test data for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Add random activity counts for each category
      const categories = ['Gg', 'RRR', 'SSS'];
      for (const category of categories) {
        if (Math.random() > 0.5) { // 50% chance of having activity
          testData.push({
            user_id: user.id,
            category,
            date: dateStr,
            count: Math.floor(Math.random() * 5) + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    const { error } = await supabase
      .from('learning_activity')
      .insert(testData);
    if (error) {
      console.error('Error inserting test data:', error);
      return;
    }

    console.log('Test data inserted successfully');
  } catch (error) {
    console.error('Error adding test data:', error);
  }
}

// Pomodoro Tasks Management
export interface PomodoroTask {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  metrics: {
    totalMinutes: number;
    completedPomodoros: number;
    currentStreak: number;
  };
  created_at?: string;
  updated_at?: string;
}

export async function getPomodoroTasks(): Promise<PomodoroTask[]> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('pomodoro_tasks')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error in getPomodoroTasks:', error);
    return [];
  }
}

export async function createPomodoroTask(task: Omit<PomodoroTask, 'user_id' | 'created_at' | 'updated_at'>): Promise<PomodoroTask> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    // Ensure metrics is properly formatted
    const taskWithDefaults = {
      ...task,
      metrics: task.metrics || {
        totalMinutes: 0,
        completedPomodoros: 0,
        currentStreak: 0
      },
      user_id: user.data.user.id
    };

    const { data, error } = await supabase
      .from('pomodoro_tasks')
      .insert(taskWithDefaults)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createPomodoroTask:', error);
    throw error;
  }
}

export async function updatePomodoroTask(id: string, updates: Partial<Omit<PomodoroTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<PomodoroTask> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    // If metrics is being updated, ensure it has the correct structure
    const updatesWithDefaults = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // If metrics is being updated, make sure it's properly formatted as JSONB
    if (updates.metrics) {
      updatesWithDefaults.metrics = {
        totalMinutes: updates.metrics.totalMinutes || 0,
        completedPomodoros: updates.metrics.completedPomodoros || 0,
        currentStreak: updates.metrics.currentStreak || 0
      };
    }

    const { data, error } = await supabase
      .from('pomodoro_tasks')
      .update(updatesWithDefaults)
      .eq('id', id)
      .eq('user_id', user.data.user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updatePomodoroTask:', error);
    throw error;
  }
}

export async function deletePomodoroTask(id: string): Promise<void> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('pomodoro_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.data.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error in deletePomodoroTask:', error);
    throw error;
  }
}

// Fonction pour récupérer les données d'activité d'apprentissage
export async function getLearningActivity(): Promise<{ date: string; count: number; category?: string }[]> {
  try {
    // Récupérer l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Récupérer les éléments d'apprentissage de l'utilisateur
    const { data: items, error } = await supabase
      .from('learning_items')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    if (!items || items.length === 0) {
      return [];
    }

    // Structurer les données d'activité à partir des sessions de progression
    const activityData: { date: string; count: number; category?: string }[] = [];

    items.forEach(item => {
      // S'assurer que progress et sessions existent
      if (item.progress && item.progress.sessions) {
        // Grouper les sessions par date
        const sessionsByDate: Record<string, { count: number; category?: string }> = {};
        item.progress.sessions.forEach(session => {
          if (session.startTime) {
            // Extraire la date (YYYY-MM-DD) de la date de début
            const date = session.startTime.split('T')[0];
            
            if (!sessionsByDate[date]) {
              sessionsByDate[date] = { count: 0, category: item.category };
            }

            // Incrémenter le compteur pour cette date
            sessionsByDate[date].count += 1;
          }
        });

        // Convertir en tableau de données d'activité
        Object.entries(sessionsByDate).forEach(([date, data]) => {
          activityData.push({
            date,
            count: data.count,
            category: data.category
          });
        });
      }
    });

    // Récupérer également les données de suivi d'activité spécifiques (si elles existent)
    const { data: trackedActivities, error: trackError } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id);

    if (trackError) {
      console.error('Error fetching activity tracking data:', trackError);
    } else if (trackedActivities && trackedActivities.length > 0) {
      // Ajouter les données de suivi d'activité au tableau de données d'activité
      trackedActivities.forEach(activity => {
        activityData.push({
          date: activity.date,
          count: activity.count || 1, // Assurer qu'un count est toujours défini
          category: activity.category
        });
      });
    }

    return activityData;
  } catch (error) {
    console.error('Error in getLearningActivity:', error);
    return [];
  }
}
