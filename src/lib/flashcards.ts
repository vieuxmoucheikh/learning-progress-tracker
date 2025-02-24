import { supabase } from './supabase';
import type { Flashcard, FlashcardDeck, FlashcardReview } from '../types';

// Deck operations
export const createDeck = async (name: string, description?: string, tags: string[] = []) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('flashcard_decks')
    .insert({
      name,
      description,
      tags,
      user_id: userData.user.id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getDecks = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('flashcard_decks')
    .select('*, flashcards(count)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(deck => ({
    ...deck,
    cardCount: deck.flashcards?.[0]?.count || 0
  }));
};

export const getDeckById = async (deckId: string) => {
  const { data, error } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('id', deckId)
    .single();

  if (error) throw error;
  return data;
};

export const deleteDeck = async (deckId: string) => {
  const { error } = await supabase
    .from('flashcard_decks')
    .delete()
    .eq('id', deckId);

  if (error) {
    console.error('Error deleting deck:', error);
    throw error;
  }
};

// Flashcard operations
export const createFlashcard = async (
  deckId: string,
  frontContent: string,
  backContent: string,
  tags: string[] = [],
  media: any[] = []
) => {
  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      deck_id: deckId,
      front_content: frontContent,
      back_content: backContent,
      tags,
      media
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFlashcard = async (flashcardId: string) => {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', flashcardId);

  if (error) {
    console.error('Error deleting flashcard:', error);
    throw error;
  }
};

export const getCards = async (deckId: string) => {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting cards:', error);
    throw error;
  }

  return data || [];
};

export const getDueCards = async (deckId?: string) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('flashcards')
    .select('*');

  if (deckId) {
    query = query.eq('deck_id', deckId);
  }

  const { data, error } = await query
    .order('next_review', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('Error getting due cards:', error);
    throw error;
  }

  return data || [];
};

export const getCardsByDeck = async (deckId: string) => {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Review operations
export const submitReview = async (
  flashcardId: string,
  quality: number,
  previousInterval: number,
  newInterval: number,
  previousEaseFactor: number,
  newEaseFactor: number
) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }

  // Calculate the next review date based on the new interval
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  // First update the flashcard
  const { error: cardError } = await supabase
    .from('flashcards')
    .update({
      review_interval: newInterval,
      ease_factor: newEaseFactor,
      repetitions: supabase.rpc('increment_repetitions', { flashcard_id: flashcardId }),
      last_reviewed: new Date().toISOString(),
      next_review: nextReviewDate.toISOString()
    })
    .eq('id', flashcardId);

  if (cardError) {
    console.error('Error updating flashcard:', cardError);
    throw cardError;
  }

  // Then create the review record
  const { error: reviewError } = await supabase
    .from('flashcard_reviews')
    .insert({
      flashcard_id: flashcardId,
      quality,
      previous_interval: previousInterval,
      new_interval: newInterval,
      previous_ease_factor: previousEaseFactor,
      new_ease_factor: newEaseFactor,
      user_id: userData.user.id
    });

  if (reviewError) {
    console.error('Error creating review:', reviewError);
    throw reviewError;
  }
};

// SuperMemo-2 Algorithm implementation
export const calculateNextReview = (
  quality: number,
  previousInterval: number,
  previousEaseFactor: number,
  repetitions: number
): { interval: number; easeFactor: number } => {
  // Quality should be between 0 and 5
  quality = Math.max(0, Math.min(5, quality));
  
  let interval: number;
  let easeFactor = previousEaseFactor;

  // Update ease factor
  easeFactor = Math.max(1.3, previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  // Calculate interval
  if (quality < 3) {
    // If response quality is less than 3, start over
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * easeFactor);
    }
  }

  return { interval, easeFactor };
};
