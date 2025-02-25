import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload an image to Supabase Storage
 * @param file The file to upload
 * @returns URL of the uploaded image
 */
export const uploadImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `flashcard-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('flashcards')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('flashcards')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete an image from Supabase Storage
 * @param url The public URL of the image to delete
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('flashcards') + 1).join('/');

    if (!filePath) {
      throw new Error('Invalid image URL');
    }

    const { error } = await supabase.storage
      .from('flashcards')
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
