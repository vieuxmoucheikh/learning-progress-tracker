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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item data');
    }

    // Create a clean database object
    const newItem = {
      title: (item.title || '').trim(),
      type: item.type || 'video',
      url: (item.url || '').trim(),
      notes: (item.notes || '').trim(),
      completed: Boolean(item.completed),
      category: (item.category || '').trim(),
      priority: item.priority || 'medium',
      tags: Array.isArray(item.tags) ? item.tags.map(tag => (tag || '').trim()).filter(Boolean) : [],
      progress: {
        current: {
          hours: Math.max(0, parseInt(String(item.current?.hours || 0)) || 0),
          minutes: Math.max(0, parseInt(String(item.current?.minutes || 0)) || 0)
        },
        target: {
          hours: Math.max(0, parseInt(String(item.total?.hours || 0)) || 0),
          minutes: Math.max(0, parseInt(String(item.total?.minutes || 0)) || 0)
        },
        lastAccessed: new Date().toISOString(),
        sessions: []
      },
      date: item.date || new Date().toISOString(),
      difficulty: item.difficulty || 'medium',
      status: item.status || 'not_started',
      unit: item.unit || 'hours',
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
