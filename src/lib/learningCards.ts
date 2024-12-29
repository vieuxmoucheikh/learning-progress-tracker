import { supabase } from './supabase';
import type { EnhancedLearningContent } from '../types';

type SaveCardData = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

export const learningCardsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as EnhancedLearningContent[];
  },

  async getByTags(tags: string[]) {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('*')
      .contains('tags', tags)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as EnhancedLearningContent[];
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as EnhancedLearningContent[];
  },

  async create(card: Omit<SaveCardData, 'id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert([{
        ...card,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data as EnhancedLearningContent;
  },

  async update(id: string, updates: Partial<SaveCardData>) {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EnhancedLearningContent;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('enhanced_learning_cards')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
