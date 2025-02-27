import { supabase } from './supabase';
import type { CardMedia, EnhancedLearningCard, NewEnhancedLearningCard } from '@/types';
import type { Options as Html2PdfOptions } from 'html2pdf.js';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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
      media: this.parseMedia(card.media),
      tags: Array.isArray(card.tags) ? card.tags : [],
      category: card.category || '',
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      mastered: card.mastered || false
    }));
  }

  async createCard(card: NewEnhancedLearningCard): Promise<EnhancedLearningCard> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const cardData = {
      title: card.title,
      content: card.content,
      tags: card.tags || [],
      category: card.category || '',
      user_id: user.id,
      mastered: card.mastered || false
    };

    const { data, error } = await supabase
      .from('enhanced_learning_cards')
      .insert(cardData)
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
      media: this.parseMedia(data.media),
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || '',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      mastered: data.mastered || false
    };
  }

  async updateCard(id: string, updates: Partial<EnhancedLearningCard>): Promise<EnhancedLearningCard> {
    try {
      const normalizedCategory = (updates.category || 'Uncategorized');
      const now = new Date().toISOString();

      const updateData: any = {
        updated_at: now // Always update the timestamp
      };
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.mastered !== undefined) updateData.mastered = updates.mastered;
      if (updates.category !== undefined) updateData.category = normalizedCategory;
      
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
        id: data.id,
        title: data.title,
        content: data.content || '',
        media: this.parseMedia(data.media),
        tags: Array.isArray(data.tags) ? data.tags : [],
        category: data.category || '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        mastered: data.mastered || false
      };
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

  async exportToPdf(title: string, element: HTMLElement): Promise<void> {
    const opt: Html2PdfOptions = {
      margin: [15, 15] as [number, number],
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };

    try {
      await html2pdf()
        .set(opt)
        .from(element)
        .save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private parseMedia(media: any): CardMedia[] {
    if (!media) return [];
    if (Array.isArray(media)) {
      return media.map(item => ({
        ...item,
        type: item.type === 'link' || item.type === 'image' ? item.type : 'image'
      }));
    }
    try {
      const parsed = JSON.parse(media);
      return Array.isArray(parsed) ? parsed.map(item => ({
        ...item,
        type: item.type === 'link' || item.type === 'image' ? item.type : 'image'
      })) : [];
    } catch {
      return [];
    }
  }

  private getHtml2PdfOptions(title: string): Html2PdfOptions {
    return {
      margin: [15, 15] as [number, number],
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
  }
}

export const learningCardsService = new LearningCardsService();
