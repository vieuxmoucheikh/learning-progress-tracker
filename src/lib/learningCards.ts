import { supabase } from './supabase';
import type { CardMedia, EnhancedLearningCard, NewEnhancedLearningCard } from '@/types';

class LearningCardsService {
  async getCards(): Promise<EnhancedLearningCard[]> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      throw new Error('Failed to fetch cards');
    }

    // Ensure dates are valid and handle nulls
    return (data || []).map(card => ({
      ...card,
      created_at: card.created_at || new Date().toISOString(),
      updated_at: card.updated_at || new Date().toISOString(),
      tags: Array.isArray(card.tags) ? card.tags : [],
      media: Array.isArray(card.media) ? card.media : [],
      mastered: Boolean(card.mastered),
      difficulty: card.difficulty || 'medium',
      status: card.status || 'in-progress',
      category: card.category || '',
      background_color: card.background_color || ''
    }));
  }

  async createCard(card: NewEnhancedLearningCard): Promise<EnhancedLearningCard> {
    const now = new Date().toISOString();
    const newCard = {
      ...card,
      created_at: now,
      updated_at: now,
      tags: card.tags || [],
      media: card.media || [],
      mastered: Boolean(card.mastered),
      difficulty: card.difficulty || 'medium',
      status: card.status || 'in-progress',
      category: card.category || '',
      background_color: card.background_color || ''
    };

    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert(newCard)
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw new Error('Failed to create card');
    }

    return {
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
      tags: Array.isArray(data.tags) ? data.tags : [],
      media: Array.isArray(data.media) ? data.media : [],
      mastered: Boolean(data.mastered),
      difficulty: data.difficulty || 'medium',
      status: data.status || 'in-progress',
      category: data.category || '',
      background_color: data.background_color || ''
    };
  }

  async updateCard(id: string, updates: Partial<EnhancedLearningCard>): Promise<EnhancedLearningCard> {
    const now = new Date().toISOString();
    const updateData = {
      ...updates,
      updated_at: now,
      tags: updates.tags || [],
      media: updates.media || [],
      mastered: Boolean(updates.mastered)
    };

    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      throw new Error('Failed to update card');
    }

    return {
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
      tags: Array.isArray(data.tags) ? data.tags : [],
      media: Array.isArray(data.media) ? data.media : [],
      mastered: Boolean(data.mastered),
      difficulty: data.difficulty || 'medium',
      status: data.status || 'in-progress',
      category: data.category || '',
      background_color: data.background_color || ''
    };
  }

  async deleteCard(id: string): Promise<void> {
    const { error } = await supabase
      .from('enhanced_learning_cards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting card:', error);
      throw new Error('Failed to delete card');
    }
  }

  private parseMedia(media: any): CardMedia[] {
    if (Array.isArray(media)) {
      return media;
    }
    if (typeof media === 'string') {
      try {
        const parsed = JSON.parse(media);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

export const learningCardsService = new LearningCardsService();
