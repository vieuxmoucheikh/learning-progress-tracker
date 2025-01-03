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

    console.log('Retrieved activities:', data?.map(a => ({
      id: a.id,
      category: a.category,
      date: a.date,
      count: a.count,
      created_at: a.created_at
    })));
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

    const normalizedCategory = category.toUpperCase();
    console.log('Incrementing activity:', { 
      category: normalizedCategory,
      originalCategory: category,
      date, 
      userId: user.id 
    });

    // First try to update existing record
    const { data: existing, error: selectError } = await supabase
      .from('learning_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', normalizedCategory)
      .eq('date', date)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing activity:', selectError);
      throw selectError;
    }

    const timestamp = new Date('2025-01-03T09:25:45+01:00').toISOString();

    if (existing) {
      console.log('Found existing activity:', {
        id: existing.id,
        category: existing.category,
        date: existing.date,
        count: existing.count,
        raw_category: existing.category
      });
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

      console.log('Activity updated:', {
        id: updated.id,
        category: updated.category,
        date: updated.date,
        count: updated.count,
        raw_category: updated.category
      });
      return updated;
    } else {
      console.log('Creating new activity for:', { 
        category: normalizedCategory,
        originalCategory: category,
        date 
      });
      
      const newActivity = {
        user_id: user.id,
        category: normalizedCategory,
        date,
        count: 1,
        created_at: timestamp,
        updated_at: timestamp
      };
      console.log('New activity data:', newActivity);

      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from('learning_activity')
        .insert(newActivity)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting activity:', insertError);
        throw insertError;
      }

      console.log('Activity created:', {
        id: inserted.id,
        category: inserted.category,
        date: inserted.date,
        count: inserted.count,
        raw_category: inserted.category
      });
      return inserted;
    }
  } catch (error) {
    console.error('Error incrementing learning activity:', error);
    return null;
  }
}
