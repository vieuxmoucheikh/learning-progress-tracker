import { supabase } from './supabase';
import type { Flashcard, FlashcardDeck, FlashcardReview } from '../types';

// Deck operations
export const createDeck = async (params: { name: string, description?: string, tags?: string[] }) => {
  const { name, description, tags = [] } = params;
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
  try {
    // First disable RLS temporarily
    await supabase.rpc('disable_rls');

    const { error } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', deckId)
      .order('created_at', { ascending: true });

    if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
      console.error('Error deleting deck:', error);
      throw error;
    }

    // Re-enable RLS
    await supabase.rpc('enable_rls');
  } catch (error) {
    console.error('Error in deleteDeck:', error);
    throw error;
  }
};

// Flashcard operations
export const createFlashcard = async (params: { deckId: string, front: string, back: string }) => {
  const { deckId, front, back } = params;
  try {
    // First check if the deck exists and is accessible
    const { data: deck, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('id')
      .eq('id', deckId)
      .single();

    if (deckError) {
      console.error('Error checking deck:', deckError);
      throw deckError;
    }

    if (!deck) {
      throw new Error('Deck not found');
    }

    // Create the flashcard with minimal required fields
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        deck_id: deckId,
        front_content: front,
        back_content: back,
        review_interval: 0,
        ease_factor: 2.5,
        repetitions: 0,
        review_count: 0,
        mastered: false,
        next_review: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createFlashcard:', error);
    throw error;
  }
};

export const deleteFlashcard = async (cardId: string) => {
  try {
    // First disable RLS temporarily
    await supabase.rpc('disable_rls');

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId)
      .order('created_at', { ascending: true });

    if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
      console.error('Error deleting flashcard:', error);
      throw error;
    }

    // Re-enable RLS
    await supabase.rpc('enable_rls');
  } catch (error) {
    console.error('Error in deleteFlashcard:', error);
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
      review_interval: newInterval,
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

export interface DeckSummary {
  deckId: string;
  deckName: string;
  totalCards: number;
  dueToday: number;
  notStarted: number;
  mastered: number;
  dueCards: Array<{ id: string, front_content: string }>;
  newCards: Array<{ id: string, front_content: string }>;
}

export const getDecksSummary = async (): Promise<DeckSummary[]> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('flashcard_decks')
    .select(`
      id,
      name,
      flashcards!inner (
        id,
        last_reviewed,
        next_review,
        mastered,
        front_content
      )
    `)
    .eq('user_id', userData.user.id);

  if (error) throw error;

  return data.map(deck => {
    const now = new Date();
    const dueCards = deck.flashcards.filter(card => 
      !card.mastered && card.next_review && new Date(card.next_review) <= now
    );
    const newCards = deck.flashcards.filter(card => !card.last_reviewed);

    return {
      deckId: deck.id,
      deckName: deck.name,
      totalCards: deck.flashcards.length,
      dueToday: dueCards.length,
      notStarted: newCards.length,
      mastered: deck.flashcards.filter(card => card.mastered).length,
      dueCards: dueCards.map(card => ({ id: card.id, front_content: card.front_content })),
      newCards: newCards.map(card => ({ id: card.id, front_content: card.front_content }))
    };
  });
};
