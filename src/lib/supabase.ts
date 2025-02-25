import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
})

// Initialize storage bucket if it doesn't exist
export const ensureStorageBucket = async () => {
  try {
    // First check if bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) throw listError;

    const flashcardBucket = buckets?.find(b => b.name === 'flashcard_images');
    
    if (!flashcardBucket) {
      // Create the bucket
      const { data, error: createError } = await supabase
        .storage
        .createBucket('flashcard_images', {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
          fileSizeLimit: 5242880 // 5MB
        });

      if (createError) throw createError;

      // Wait a moment for the bucket to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000));

      return true;
    }

    return true;
  } catch (error) {
    console.error('Error ensuring storage bucket exists:', error);
    return false;
  }
};

// Call this when the app starts
ensureStorageBucket();
