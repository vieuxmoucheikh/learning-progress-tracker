import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define interfaces for our context
interface PomodoroContextType {
  isActive: boolean;
  isBreak: boolean;
  time: number;
  settings: any;
  isPageActive: boolean; // Track if the pomodoro page is currently active
  setIsPageActive: (active: boolean) => void;
  // You may need to add more state and functions based on your implementation
}

// Create the context with default values
const PomodoroContext = createContext<PomodoroContextType>({
  isActive: false,
  isBreak: false,
  time: 25 * 60,
  settings: null,
  isPageActive: false,
  setIsPageActive: () => {},
});

// Provider component
export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  // The state that needs to persist across tab changes
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [time, setTime] = useState(25 * 60);
  const [settings, setSettings] = useState(null);
  const [isPageActive, setIsPageActive] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const storedState = localStorage.getItem('pomodoroState');
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        setIsActive(parsedState.isActive);
        setIsBreak(parsedState.isBreak);
        setTime(parsedState.time);
        if (parsedState.settings) {
          setSettings(parsedState.settings);
        }
      } catch (error) {
        console.error('Error parsing pomodoro state from localStorage:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pomodoroState', JSON.stringify({
      isActive,
      isBreak,
      time,
      settings,
    }));
  }, [isActive, isBreak, time, settings]);

  return (
    <PomodoroContext.Provider
      value={{
        isActive,
        isBreak,
        time,
        settings,
        isPageActive,
        setIsPageActive,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
};

// Hook to use the Pomodoro context
export const usePomodoroContext = () => useContext(PomodoroContext);
