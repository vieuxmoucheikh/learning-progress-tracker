-- Migration pour ajouter la table de suivi d'activité

-- Créer la table learning_activity
CREATE TABLE IF NOT EXISTS learning_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now()),
  
  -- Index pour des requêtes plus rapides
  CONSTRAINT unique_user_date_category UNIQUE (user_id, date, category)
);

-- Créer la fonction qui sera utilisée par trackLearningActivity
CREATE OR REPLACE FUNCTION insert_or_update_learning_activity(
  p_user_id UUID,
  p_date DATE,
  p_category TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO learning_activity (user_id, date, category)
  VALUES (p_user_id, p_date, p_category)
  ON CONFLICT (user_id, date, category)
  DO UPDATE SET count = learning_activity.count + 1;
END;
$$ LANGUAGE plpgsql;

-- Ajout des permissions RLS (Row Level Security)
ALTER TABLE learning_activity ENABLE ROW LEVEL SECURITY;

-- Politique d'accès: les utilisateurs ne peuvent voir que leurs propres activités
CREATE POLICY select_own_activity ON learning_activity
  FOR SELECT USING (auth.uid() = user_id);

-- Politique d'insertion: les utilisateurs ne peuvent insérer que leurs propres données
CREATE POLICY insert_own_activity ON learning_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour: les utilisateurs ne peuvent mettre à jour que leurs propres données
CREATE POLICY update_own_activity ON learning_activity
  FOR UPDATE USING (auth.uid() = user_id);
