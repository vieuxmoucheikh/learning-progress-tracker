import { supabase } from './supabase'
import type { LearningItem, StreakData, LearningItemFormData, LearningGoal } from '../types'

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
    const { error } = await supabase.rpc('create_goals_table', {});
    if (error) {
      console.error('Error creating goals table:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in ensureGoalsTableExists:', error);
    return false;
  }
}

export async function getGoals() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    await ensureGoalsTableExists();

    const { data, error } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching goals:', error);
      return [];
    }

    // Transform the data to match the LearningGoal interface
    const transformedData = data?.map(goal => ({
      id: goal.id,
      userId: goal.user_id,
      title: goal.title,
      category: goal.category,
      targetHours: goal.target_hours,
      targetDate: goal.target_date,
      priority: goal.priority,
      status: goal.status,
      createdAt: goal.created_at
    })) || [];
    
    return transformedData;
  } catch (error) {
    console.error('Error in getGoals:', error);
    return [];
  }
}

export async function addGoal(goal: Omit<LearningGoal, 'id' | 'userId' | 'createdAt' | 'status'>) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    console.log('Adding goal with user:', user.id);
    console.log('Goal data:', goal);

    await ensureGoalsTableExists();

    const newGoal = {
      user_id: user.id,
      title: goal.title.trim(),
      category: goal.category.trim(),
      target_hours: goal.targetHours,
      target_date: goal.targetDate,
      priority: goal.priority || 'medium',
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Formatted goal data:', newGoal);

    const { data, error } = await supabase
      .from('learning_goals')
      .insert([newGoal])
      .select()
      .single();

    if (error) {
      console.error('Error adding goal:', error);
      throw new Error(error.message || 'Failed to add goal');
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    console.log('Successfully added goal:', data);

    // Transform the data to match the LearningGoal interface
    const transformedData: LearningGoal = {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      category: data.category,
      targetHours: data.target_hours,
      targetDate: data.target_date,
      priority: data.priority,
      status: data.status,
      createdAt: data.created_at
    };

    return transformedData;
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

    await ensureGoalsTableExists();

    const { data, error } = await supabase
      .from('learning_goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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

    return data;
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

    await ensureGoalsTableExists();

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
