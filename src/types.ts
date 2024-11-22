export interface LearningItem {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'url' | 'book' | 'course' | 'article';
  progress: {
    current: { hours: number; minutes: number };
    total?: { hours: number; minutes: number };
    lastAccessed: string;
    sessions: {
      date: string;
      duration: { hours: number; minutes: number };
      notes?: string;
    }[];
  };
  url?: string;
  notes?: string;
  completed: boolean;
  completedAt?: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags: string[];
  goal?: { hours: number; minutes: number };
  date: string;
  lastTimestamp?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'archived';
  rating?: 1 | 2 | 3 | 4 | 5;
  reminders?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    customDays?: number;
    lastReminder?: string;
  };
}

export type LearningItemFormData = Omit<LearningItem, 'id' | 'progress'> & {
  current: { hours: number; minutes: number };
  total?: { hours: number; minutes: number };
  goal?: { hours: number; minutes: number };
  unit: 'hours' | 'pages' | 'percent';
  lastTimestamp?: number;
};

export interface StreakData {
  currentStreak: number;
  lastActivityDate: string | null;
  longestStreak: number;
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