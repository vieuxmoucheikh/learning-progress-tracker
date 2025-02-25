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
    .rpc('delete_deck', { deck_id: deckId });

  if (error) {
    console.error('Error deleting deck:', error);
    throw error;
  }
};

// Flashcard operations
export const createFlashcard = async (deckId: string, frontContent: string, backContent: string) => {
  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      deck_id: deckId,
      front_content: frontContent,
      back_content: backContent,
      interval: 0,
      ease_factor: 2.5,
      repetitions: 0,
      review_count: 0,
      mastered: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFlashcard = async (cardId: string) => {
  const { error } = await supabase
    .rpc('delete_flashcard', { card_id: cardId });

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
    .order('created_at');

  if (error) throw error;
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
  prevInterval: number,
  prevEaseFactor: number,
  repetitions: number
) => {
  // Initialize values for first review
  let interval = prevInterval || 1;
  let easeFactor = prevEaseFactor || 2.5;
  let mastered = false;

  // Quality ratings:
  // 1 = Hard (2 days)
  // 2 = Medium (4 days)
  // 3 = Easy (1 month)
  // 4 = Mastered (remove from rotation)

  switch (quality) {
    case 1: // Hard
      interval = 2;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      break;
    case 2: // Medium
      interval = 4;
      break;
    case 3: // Easy
      interval = 30; // 1 month
      easeFactor = easeFactor + 0.15;
      break;
    case 4: // Mastered
      mastered = true;
      break;
  }

  // Increment repetitions
  repetitions = repetitions + 1;

  return { interval, easeFactor, repetitions, mastered };
};

export const submitReview = async (
  cardId: string,
  quality: number,
  prevInterval: number,
  newInterval: number,
  prevEaseFactor: number,
  newEaseFactor: number,
  mastered: boolean
) => {
  const now = new Date();
  let nextReview = null;
  
  if (!mastered) {
    nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + newInterval);
  }

  // First get the current review count
  const { data: currentCard, error: getError } = await supabase
    .from('flashcards')
    .select('review_count')
    .eq('id', cardId)
    .single();

  if (getError) throw getError;

  // Then update the card with the new review count
  const { data, error } = await supabase
    .from('flashcards')
    .update({
      last_reviewed: now.toISOString(),
      next_review: nextReview?.toISOString() || null,
      interval: newInterval,
      ease_factor: newEaseFactor,
      repetitions: (prevInterval || 0) + 1,
      mastered: mastered,
      review_count: (currentCard?.review_count || 0) + 1
    })
    .eq('id', cardId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
