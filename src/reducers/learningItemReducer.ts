import { LearningItem } from '../types';

export type LearningItemAction = 
  | { type: 'SET_ITEMS'; payload: LearningItem[] }
  | { type: 'ADD_ITEM'; payload: LearningItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: LearningItem } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'START_TRACKING'; payload: string }
  | { type: 'STOP_TRACKING'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export interface LearningItemState {
  items: LearningItem[];
  loading: boolean;
  error: string | null;
}

export function learningItemReducer(
  state: LearningItemState,
  action: LearningItemAction
): LearningItemState {
  switch (action.type) {
    case 'SET_ITEMS':
      return {
        ...state,
        items: action.payload,
        loading: false
      };

    case 'ADD_ITEM':
      return {
        ...state,
        items: [action.payload, ...state.items]
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        )
      };

    case 'DELETE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    case 'START_TRACKING':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload
            ? {
                ...item,
                progress: {
                  ...item.progress,
                  sessions: [
                    ...item.progress.sessions,
                    {
                      startTime: new Date().toISOString(),
                      date: new Date().toISOString(),
                      duration: { hours: 0, minutes: 0 }
                    }
                  ]
                }
              }
            : item
        )
      };

    case 'STOP_TRACKING':
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.payload) return item;

          const lastSession = item.progress.sessions[item.progress.sessions.length - 1];
          if (!lastSession?.startTime) return item;

          const endTime = new Date().toISOString();
          const duration = Math.round(
            (new Date(endTime).getTime() - new Date(lastSession.startTime).getTime()) / 60000
          );

          const minutes = duration % 60;
          const hours = Math.floor(duration / 60);

          const updatedSessions = item.progress.sessions.map((session, index) => {
            if (index === item.progress.sessions.length - 1) {
              return {
                ...session,
                endTime,
                duration: { hours, minutes }
              };
            }
            return session;
          });

          // Convert current progress and new duration to minutes for comparison
          const currentInMinutes = (item.progress.current.hours * 60) + item.progress.current.minutes;
          const newCurrentValue = { 
            hours: Math.floor((currentInMinutes + duration) / 60),
            minutes: (currentInMinutes + duration) % 60
          };
          
          // Convert total to minutes for comparison
          const totalInMinutes = (item.progress.total.hours * 60) + item.progress.total.minutes;
          const completed = (currentInMinutes + duration) >= totalInMinutes;

          return {
            ...item,
            progress: {
              ...item.progress,
              current: newCurrentValue,
              sessions: updatedSessions,
              lastAccessed: endTime
            },
            completed,
            completedAt: completed ? endTime : item.completedAt,
            status: completed ? 'completed' : item.status
          };
        })
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };

    default:
      return state;
  }
}
