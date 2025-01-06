-- Add background_color column to learning_cards table
ALTER TABLE learning_cards
ADD COLUMN background_color VARCHAR(50) DEFAULT NULL;
