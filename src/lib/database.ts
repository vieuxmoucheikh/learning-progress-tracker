import { supabase } from './supabase'
import type { LearningItem, StreakData, LearningItemFormData } from '../types'

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

export async function addLearningItem(item: LearningItemFormData): Promise<LearningItem> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user');
    }

    const { current, total, ...rest } = item;
    
    const newItem = {
      ...rest,
      progress: {
        current: {
          hours: current?.hours || 0,
          minutes: current?.minutes || 0
        },
        target: total ? {
          hours: total.hours || 0,
          minutes: total.minutes || 0
        } : {
          hours: 0,
          minutes: 0
        },
        lastAccessed: new Date().toISOString(),
        sessions: []
      },
      user_id: user.data.user.id,
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
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    return data;
  } catch (error) {
    console.error('Error in addLearningItem:', error);
    throw error;
  }
}

export async function updateLearningItem(id: string, updates: Partial<LearningItem>) {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user');
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
      .eq('user_id', user.data.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating learning item:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    return data;
  } catch (error) {
    console.error('Error in updateLearningItem:', error);
    throw error;
  }
}

export const deleteLearningItem = async (id: string) => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user');
    }

    const { error } = await supabase
      .from('learning_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.data.user.id)
    
    if (error) {
      console.error('Error deleting learning item:', error)
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Error in deleteLearningItem:', error)
    throw error
  }
}

// Streak Data
export const getStreakData = async (userId: string) => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user');
    }

    if (user.data.user.id !== userId) {
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
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('No authenticated user');
    }

    if (user.data.user.id !== userId) {
      throw new Error('Unauthorized access to streak data');
    }

    const { data, error } = await supabase
      .from('streak_data')
      .update(streakData)
      .eq('user_id', userId)
      .select()
    
    if (error) {
      console.error('Error updating streak data:', error)
      throw new Error(error.message)
    }
    
    return data[0]
  } catch (error) {
    console.error('Error in updateStreakData:', error)
    throw error
  }
}
