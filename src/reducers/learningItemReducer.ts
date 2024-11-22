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
        items: state.items.map(item => {
          if (item.id === action.payload) {
            const currentTime = new Date().toISOString();
            return {
              ...item,
              progress: {
                ...item.progress,
                lastAccessed: currentTime,
                sessions: [
                  ...item.progress.sessions,
                  {
                    startTime: currentTime,
                    date: currentTime.split('T')[0]
                  }
                ]
              }
            };
          }
          return item;
        })
      };

    case 'STOP_TRACKING':
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id === action.payload) {
            const currentTime = new Date().toISOString();
            const lastSession = item.progress.sessions[item.progress.sessions.length - 1];
            
            if (lastSession && !lastSession.endTime) {
              const startTime = new Date(lastSession.startTime);
              const elapsedMinutes = Math.round((new Date().getTime() - startTime.getTime()) / 60000);
              
              return {
                ...item,
                progress: {
                  ...item.progress,
                  lastAccessed: currentTime,
                  sessions: [
                    ...item.progress.sessions.slice(0, -1),
                    {
                      ...lastSession,
                      endTime: currentTime,
                      duration: {
                        hours: Math.floor(elapsedMinutes / 60),
                        minutes: elapsedMinutes % 60
                      }
                    }
                  ]
                }
              };
            }
          }
          return item;
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
