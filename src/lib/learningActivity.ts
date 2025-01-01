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

export async function getLearningActivity(startDate: string, endDate: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting learning activity:', error);
    throw error;
  }
}

export async function incrementLearningActivity(category: string, date: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // First try to update existing record
    const { data: existing, error: selectError } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('date', date)
      .single();

    if (selectError && selectError.code !== 'PGRST116') throw selectError;

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('learning_activity')
        .update({
          count: existing.count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('learning_activity')
        .insert({
          user_id: user.id,
          category,
          date,
          count: 1
        });

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error incrementing learning activity:', error);
    throw error;
  }
}
