import { supabase } from './supabase';
import type { CardMedia, EnhancedLearningCard, NewEnhancedLearningCard } from '@/types';

class LearningCardsService {
  async getCards(): Promise<EnhancedLearningCard[]> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .select('*');

    if (error) {
      console.error('Error fetching cards:', error);
      throw new Error('Failed to fetch cards');
    }

    return data;
  }

  async createCard(card: NewEnhancedLearningCard): Promise<EnhancedLearningCard> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert(card)
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw new Error('Failed to create card');
    }

    return data;
  }

  async updateCard(id: string, updates: Partial<EnhancedLearningCard>): Promise<EnhancedLearningCard> {
    try {
      const { data, error } = await supabase
        .from('enhanced_learning_cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating card:', error);
        throw new Error('Failed to update card');
      }

      return data;
    } catch (error) {
      console.error('Error in updateCard:', error);
      throw error;
    }
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
