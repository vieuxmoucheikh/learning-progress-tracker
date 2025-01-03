import { supabase } from './supabase';

export interface LearningActivity {
  id: string;
  user_id: string;
  category: string;
  date: string;
  count: number;
  created_at: string;
  updated_at: string;
}

export async function getLearningActivity(startDate: string, endDate: string): Promise<LearningActivity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    console.log('Getting learning activity:', { startDate, endDate, userId: user.id });

    const { data, error } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching learning activity:', error);
      throw error;
    }

    console.log('Retrieved activities:', data);
    return data || [];
  } catch (error) {
    console.error('Error getting learning activity:', error);
    return [];
  }
}

export async function incrementLearningActivity(category: string, date: string): Promise<LearningActivity | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    console.log('Incrementing activity:', { category, date, userId: user.id });

    // First try to update existing record
    const { data: existing, error: selectError } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('date', date)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing activity:', selectError);
      throw selectError;
    }

    const timestamp = new Date('2025-01-03T08:27:26+01:00').toISOString();

    if (existing) {
      console.log('Found existing activity:', existing);
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('learning_activity')
        .update({
          count: existing.count + 1,
          updated_at: timestamp
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating activity:', updateError);
        throw updateError;
      }

      console.log('Activity updated:', updated);
      return updated;
    } else {
      console.log('Creating new activity for:', { category, date });
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from('learning_activity')
        .insert({
          user_id: user.id,
          category,
          date,
          count: 1,
          created_at: timestamp,
          updated_at: timestamp
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting activity:', insertError);
        throw insertError;
      }

      console.log('Activity created:', inserted);
      return inserted;
    }
  } catch (error) {
    console.error('Error incrementing learning activity:', error);
    return null;
  }
}
