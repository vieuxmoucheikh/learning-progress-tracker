import React from 'react';
import { 
  Calendar as CalendarIcon,
  Clock as ClockIcon, 
  CheckCircle2 as CheckCircleIcon,
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  Target as TargetIcon
} from 'lucide-react';

// Style commun pour toutes les icônes
const baseIconStyle = { 
  strokeWidth: 2, 
  fill: 'none'
};

// Couleurs personnalisées pour le mode sombre
export const StyledCalendar: React.FC<React.ComponentProps<typeof CalendarIcon>> = (props) => {
  return (
    <CalendarIcon 
      {...props} 
      style={{
        ...baseIconStyle,
        color: 'var(--calendar-icon-color, #3b82f6)',
        stroke: 'var(--calendar-icon-stroke, #3b82f6)',
        ...props.style
      }}
    />
  );
};

export const StyledClock: React.FC<React.ComponentProps<typeof ClockIcon>> = (props) => {
  return (
    <ClockIcon 
      {...props} 
      style={{
        ...baseIconStyle,
        color: 'var(--clock-icon-color, #3b82f6)',
        stroke: 'var(--clock-icon-stroke, #3b82f6)',
        ...props.style
      }}
    />
  );
};

export const StyledCheckCircle: React.FC<React.ComponentProps<typeof CheckCircleIcon>> = (props) => {
  return (
    <CheckCircleIcon 
      {...props} 
      style={{
        ...baseIconStyle,
        color: 'var(--check-icon-color, #10b981)',
        stroke: 'var(--check-icon-stroke, #10b981)',
        ...props.style
      }}
    />
  );
};

export const StyledBookOpen: React.FC<React.ComponentProps<typeof BookOpenIcon>> = (props) => {
  return (
    <BookOpenIcon 
      {...props} 
      style={{
        ...baseIconStyle,
        color: 'var(--book-icon-color, #8b5cf6)',
        stroke: 'var(--book-icon-stroke, #8b5cf6)',
        ...props.style
      }}
    />
  );
};

export const StyledTrophy: React.FC<React.ComponentProps<typeof TrophyIcon>> = (props) => {
  return (
    <TrophyIcon 
      {...props} 
      style={{
        ...baseIconStyle,
        color: 'var(--trophy-icon-color, #f59e0b)',
        stroke: 'var(--trophy-icon-stroke, #f59e0b)',
        ...props.style
      }}
    />
  );
};

export const StyledTarget: React.FC<React.ComponentProps<typeof TargetIcon>> = (props) => {
  return (
    <TargetIcon 
      {...props} 
      style={{
        ...baseIconStyle,
        color: 'var(--target-icon-color, #10b981)',
        stroke: 'var(--target-icon-stroke, #10b981)',
        ...props.style
      }}
    />
  );
};
