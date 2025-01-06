import { supabase } from './supabase';
import type { CardMedia, EnhancedLearningCard, NewEnhancedLearningCard } from '@/types';

const normalizeDate = (dateString: any): string => {
  if (!dateString) return new Date().toISOString();
  
  try {
    // Handle PostgreSQL timestamp with timezone
    // Remove timezone offset and convert to UTC
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (e) {
    console.error('Error parsing date:', dateString, e);
    return new Date().toISOString();
  }
};

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

    console.log('Raw data from Supabase:', data);

    return (data || []).map(card => {
      console.log('Processing card:', card);
      const processed = {
        id: card.id,
        title: card.title || '',
        content: card.content || '',
        created_at: normalizeDate(card.created_at),
        updated_at: normalizeDate(card.updated_at),
        tags: Array.isArray(card.tags) ? card.tags : [],
        media: Array.isArray(card.media) ? card.media : [],
        mastered: Boolean(card.mastered),
        difficulty: card.difficulty || 'medium',
        status: card.status || 'in-progress',
        category: card.category || '',
        background_color: card.background_color || '',
        user_id: card.user_id
      };
      console.log('Processed card:', processed);
      return processed;
    });
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

    console.log('Creating card with data:', newCard);

    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert(newCard)
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw new Error('Failed to create card');
    }

    console.log('Created card data:', data);

    const processed = {
      id: data.id,
      title: data.title || '',
      content: data.content || '',
      created_at: normalizeDate(data.created_at),
      updated_at: normalizeDate(data.updated_at),
      tags: Array.isArray(data.tags) ? data.tags : [],
      media: Array.isArray(data.media) ? data.media : [],
      mastered: Boolean(data.mastered),
      difficulty: data.difficulty || 'medium',
      status: data.status || 'in-progress',
      category: data.category || '',
      background_color: data.background_color || '',
      user_id: data.user_id
    };

    console.log('Processed created card:', processed);
    return processed;
  }

  async updateCard(id: string, updates: Partial<EnhancedLearningCard>): Promise<EnhancedLearningCard> {
    const now = new Date().toISOString();
    const updateData = {
      ...updates,
      updated_at: now
    };

    console.log('Updating card with data:', updateData);

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

    console.log('Updated card data:', data);

    const processed = {
      id: data.id,
      title: data.title || '',
      content: data.content || '',
      created_at: normalizeDate(data.created_at),
      updated_at: normalizeDate(data.updated_at),
      tags: Array.isArray(data.tags) ? data.tags : [],
      media: Array.isArray(data.media) ? data.media : [],
      mastered: Boolean(data.mastered),
      difficulty: data.difficulty || 'medium',
      status: data.status || 'in-progress',
      category: data.category || '',
      background_color: data.background_color || '',
      user_id: data.user_id
    };

    console.log('Processed updated card:', processed);
    return processed;
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
