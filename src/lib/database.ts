import { supabase } from './supabase'
import type { LearningItem, StreakData, LearningItemFormData } from '../types'

// Learning Items
export const getLearningItems = async () => {
  try {
    const { data, error } = await supabase
      .from('learning_items')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) {
      console.error('Error fetching learning items:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getLearningItems:', error)
    return []
  }
}

export async function addLearningItem(item: LearningItemFormData): Promise<LearningItem> {
  try {
    const { current, total, ...rest } = item;
    
    const newItem = {
      ...rest,
      progress: {
        current: {
          hours: current.hours,
          minutes: current.minutes
        },
        total: total ? {
          hours: total.hours,
          minutes: total.minutes
        } : {
          hours: 0,
          minutes: 0
        },
        lastAccessed: new Date().toISOString(),
        sessions: []
      },
      user_id: (await supabase.auth.getUser()).data.user?.id
    };

    const { data, error } = await supabase
      .from('learning_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('Error adding learning item:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addLearningItem:', error);
    throw error;
  }
}

export async function updateLearningItem(id: string, updates: Partial<LearningItem>) {
  try {
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
          sessions: [...(currentItem.progress.sessions || []), ...(updates.progress.sessions || [])]
        };
      }
    }

    const { data, error } = await supabase
      .from('learning_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating learning item:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateLearningItem:', error);
    throw error;
  }
}

export const deleteLearningItem = async (id: string) => {
  try {
    const { error } = await supabase
      .from('learning_items')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting learning item:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteLearningItem:', error)
    throw error
  }
}

// Streak Data
export const getStreakData = async (userId: string) => {
  try {
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
    const { data, error } = await supabase
      .from('streak_data')
      .update(streakData)
      .eq('user_id', userId)
      .select()
    
    if (error) {
      console.error('Error updating streak data:', error)
      throw error
    }
    
    return data[0]
  } catch (error) {
    console.error('Error in updateStreakData:', error)
    throw error
  }
}
