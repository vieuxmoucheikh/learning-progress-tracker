import { supabase } from './supabase'
import type { LearningItem, StreakData } from '../types'

// Learning Items
export const getLearningItems = async () => {
  const { data, error } = await supabase
    .from('learning_items')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export const addLearningItem = async (item: Omit<LearningItem, 'id'>) => {
  const { data, error } = await supabase
    .from('learning_items')
    .insert([item])
    .select()
  
  if (error) throw error
  return data[0]
}

export const updateLearningItem = async (id: string, updates: Partial<LearningItem>) => {
  const { data, error } = await supabase
    .from('learning_items')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export const deleteLearningItem = async (id: string) => {
  const { error } = await supabase
    .from('learning_items')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Streak Data
export const getStreakData = async (userId: string) => {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
  return data
}

export const updateStreakData = async (userId: string, streakData: Omit<StreakData, 'user_id'>) => {
  const { data, error } = await supabase
    .from('streaks')
    .upsert({ user_id: userId, ...streakData })
    .select()
  
  if (error) throw error
  return data[0]
}
