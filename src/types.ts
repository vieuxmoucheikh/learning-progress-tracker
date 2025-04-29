export interface Time {
  hours: number;
  minutes: number;
}

export interface GoalSession {
  date: string;
  duration?: Time;
  startTime: string;
  endTime?: string;
  status?: 'in_progress' | 'completed' | 'on_hold';
  notes?: (string | { content: string; timestamp: string })[];
}

export interface Session {
  id?: string;
  goal_id?: string;
  user_id?: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: {
    hours: number;
    minutes: number;
  };
  notes?: (string | { content: string; timestamp: string })[];
  created_at?: string;
  updated_at?: string;
  status?: 'in_progress' | 'completed' | 'on_hold';
}

export interface Progress {
  current: Time;
  total?: Time;
  lastAccessed?: string;
  sessions: GoalSession[];
  isActive?: boolean;
}

export interface LearningItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  category?: string;
  date: string;
  completed?: boolean;
  completed_at?: string;  // Date ISO d'achèvement lorsque l'élément est marqué comme terminé
  url?: string;
  footerUrl?: string; // Ajouter cette propriété pour stocker l'URL du pied de page
  priority?: 'low' | 'medium' | 'high';
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: {
    hours: number;
    minutes: number;
  };
  progress?: {
    total?: {
      hours: number;
      minutes: number;
    };
    current?: {
      hours: number;
      minutes: number;
    };
    sessions?: Session[];
  };
  notes?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'archived';
}

export type LearningItemFormData = Omit<LearningItem, 'id' | 'progress'> & {
  current: Time;
  total?: Time;
  goal?: { hours: number; minutes: number };
  unit: 'hours' | 'pages' | 'percent';
  sessions?: Session[];
  tags: string[];
};

export interface StreakData {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  history: {
    date: string;
    minutesSpent: number;
    itemsCompleted: number;
  }[];
}

export interface TimeStats {
  totalTime: { hours: number; minutes: number };
  averageDaily: { hours: number; minutes: number };
  byCategory: Record<string, { hours: number; minutes: number }>;
  byType: Record<string, { hours: number; minutes: number }>;
  mostProductiveDay: string;
  mostProductiveTime: string;
}

export type Priority = 'low' | 'medium' | 'high';
export type GoalStatus = 'active' | 'completed' | 'overdue';

export interface LearningGoal {
  id: string;
  userId: string;
  title: string;
  category: string;
  targetHours: number;
  targetDate: string;
  priority: Priority;
  status: GoalStatus;
  createdAt: string;
  progress?: {
    sessions: Array<{
      date: string;
      duration: { hours: number; minutes: number };
    }>;
  };
}

export interface Pomodoro {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  type: 'work' | 'break' | 'long_break';
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSettings {
  work_duration: number;
  break_duration: number;
  long_break_duration: number;
  pomodoros_until_long_break: number;
  sound_enabled: boolean;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  daily_goal?: number;
  notification_enabled?: boolean;
  vibration_enabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface PomodoroStats {
  totalPomodoros: number;
  completedPomodoros: number;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  dailyAverage: number;
  mostProductiveTime: string;
  currentStreak: number;
  longestStreak: number;
  focusLabels?: string[];
  weeklyCompletion?: number[];
  daily_completed: number;
  dailyGoalProgress?: number;
}

export interface CardMedia {
  type: 'image' | 'link';
  url: string;
  id: string;
  description?: string;
}

export interface EnhancedLearningCard {
  id: string;
  title: string;
  content: string;
  media?: CardMedia[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  mastered?: boolean;
  category?: string;
  lastStudied?: string;
}

export type NewEnhancedLearningCard = Omit<EnhancedLearningCard, 'id' | 'createdAt' | 'updatedAt'> & {
  mastered?: boolean;
  category?: string;
}

export interface EnhancedLearningContent {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  summary?: {
    total: number;
    dueToday: number;
    reviewStatus: 'not-started' | 'up-to-date' | 'due-soon' | 'overdue';
    lastStudied: string | null;
    nextDue: string | null;
  };
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  created_at: string;
  last_reviewed?: string;
  next_review?: string;
  interval?: number;
  ease_factor?: number;
  repetitions?: number;
  mastered: boolean;
  review_count?: number;
  tags?: string[];
}

export interface FlashcardReview {
  id: string;
  flashcard_id: string;
  quality: number;
  previous_interval: number;
  new_interval: number;
  previous_ease_factor: number;
  new_ease_factor: number;
  reviewed_at: string;
  user_id: string;
}

export interface User {
  id: string;
  email: string;
}
