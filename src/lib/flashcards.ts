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
export const calculateNextReview = (
  quality: number,
  previousInterval: number,
  previousEaseFactor: number,
  repetitions: number
): { interval: number; easeFactor: number; mastered?: boolean } => {
  let interval: number;
  let easeFactor = previousEaseFactor;
  let mastered = false;

  // Set intervals based on rating
  switch (quality) {
    case 1: // Hard
      interval = 2; // Review in 2 days
      break;
    case 2: // Medium
      interval = 4; // Review in 4 days
      break;
    case 3: // Easy
      interval = 30; // Review in a month
      break;
    case 4: // Mastered
      interval = 0; // Don't schedule
      mastered = true;
      break;
    default:
      interval = 2; // Default to 2 days
  }

  // Keep ease factor between 1.3 and 2.5
  easeFactor = Math.max(1.3, Math.min(2.5, easeFactor));

  return { interval, easeFactor, mastered };
};

export const submitReview = async (
  flashcardId: string,
  quality: number,
  previousInterval: number,
  newInterval: number,
  previousEaseFactor: number,
  newEaseFactor: number,
  mastered?: boolean
) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }

  // Calculate the next review date based on the new interval
  const nextReviewDate = mastered ? null : new Date();
  if (nextReviewDate) {
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  }

  // First get the current card to get the current repetitions
  const { data: currentCard, error: getError } = await supabase
    .from('flashcards')
    .select('repetitions')
    .eq('id', flashcardId)
    .single();

  if (getError) {
    console.error('Error getting flashcard:', getError);
    throw getError;
  }

  // Then update the flashcard with all metrics
  const { data: updatedCard, error: cardError } = await supabase
    .from('flashcards')
    .update({
      interval: newInterval,
      ease_factor: newEaseFactor,
      repetitions: (currentCard?.repetitions || 0) + 1,
      last_reviewed: new Date().toISOString(),
      next_review: nextReviewDate?.toISOString() || null,
      mastered: mastered || false
    })
    .eq('id', flashcardId)
    .select()
    .single();

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

  return updatedCard;
};
