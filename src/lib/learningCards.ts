import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { EnhancedLearningCard, NewEnhancedLearningCard } from '@/types';

export type LearningCard = EnhancedLearningCard;
export type NewLearningCard = NewEnhancedLearningCard;

export const defaultBackgroundColors = [
  { name: 'Default', value: 'bg-white' },
  { name: 'Soft Blue', value: 'bg-blue-50' },
  { name: 'Soft Green', value: 'bg-green-50' },
  { name: 'Soft Yellow', value: 'bg-yellow-50' },
  { name: 'Soft Purple', value: 'bg-purple-50' },
  { name: 'Soft Pink', value: 'bg-pink-50' },
  { name: 'Soft Orange', value: 'bg-orange-50' },
] as const;

export class LearningCardsService {
  async getCards(user: User): Promise<EnhancedLearningCard[]> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((card) => ({
      id: card.id,
      title: card.title,
      content: card.content,
      category: card.category || '',
      backgroundColor: card.backgroundColor || 'bg-white',
      tags: Array.isArray(card.tags) ? card.tags : [],
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      mastered: card.mastered || false,
      media: [],
    }));
  }

  async createCard(user: User, card: NewEnhancedLearningCard): Promise<EnhancedLearningCard> {
    const normalizedCategory = card.category?.toLowerCase().trim() || '';
    
    const cardData = {
      title: card.title,
      content: card.content,
      category: normalizedCategory,
      backgroundColor: card.backgroundColor || 'bg-white',
      tags: card.tags || [],
      user_id: user.id,
      mastered: card.mastered || false,
      media: card.media || [],
    };

    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert([cardData])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned from insert');

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category || '',
      backgroundColor: data.backgroundColor || 'bg-white',
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mastered: data.mastered || false,
      media: [],
    };
  }

  async updateCard(user: User, id: string, updates: Partial<EnhancedLearningCard>): Promise<EnhancedLearningCard> {
    try {
      const normalizedCategory = updates.category?.toLowerCase().trim();
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.mastered !== undefined) updateData.mastered = updates.mastered;
      if (updates.category !== undefined) updateData.category = normalizedCategory;
      if (updates.backgroundColor !== undefined) updateData.backgroundColor = updates.backgroundColor;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.media !== undefined) updateData.media = updates.media;
      
      const { data, error } = await supabase
        .from('enhanced_learning_cards')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Card not found');

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category || '',
        backgroundColor: data.backgroundColor || 'bg-white',
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        mastered: data.mastered || false,
        media: data.media || [],
      };
    } catch (error) {
      console.error('Error in updateCard:', error);
      throw error;
    }
  }

  async deleteCard(user: User, id: string): Promise<void> {
    const { error } = await supabase
      .from('enhanced_learning_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  async getCategories(user: User): Promise<string[]> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('category')
      .eq('user_id', user.id);

    if (error) throw error;

    const categories = new Set(data.map(item => item.category?.toLowerCase().trim()).filter(Boolean));
    return Array.from(categories).sort();
  }
}

export const learningCardsService = new LearningCardsService();
