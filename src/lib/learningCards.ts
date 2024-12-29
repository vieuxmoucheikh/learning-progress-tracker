import { supabase } from './supabase';
import type { EnhancedLearningCard, NewEnhancedLearningCard, CardMedia } from '@/types';

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

    return data.map(card => ({
      id: card.id,
      title: card.title,
      content: card.content || '',
      media: card.media || [],
      tags: card.tags || [],
      createdAt: card.created_at,
      updatedAt: card.updated_at
    }));
  }

  async createCard(card: NewEnhancedLearningCard): Promise<EnhancedLearningCard> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert({
        title: card.title,
        content: card.content,
        media: card.media || [],
        tags: card.tags || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw new Error('Failed to create card');
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content || '',
      media: data.media || [],
      tags: data.tags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async updateCard(id: string, updates: Partial<NewEnhancedLearningCard>): Promise<EnhancedLearningCard> {
    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .update({
        title: updates.title,
        content: updates.content,
        media: updates.media || [],
        tags: updates.tags || []
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      throw new Error('Failed to update card');
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content || '',
      media: data.media || [],
      tags: data.tags || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
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

  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('card-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload image');
    }

    const { data } = supabase.storage
      .from('card-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}

export const learningCardsService = new LearningCardsService();
