import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';

interface PomodoroContextProps {
    children: React.ReactNode;
}

interface PomodoroState {
    isRunning: boolean;
    remainingTime: number;
    startTime: number | null;
    taskId: string | null;
    isBreak: boolean;
    pomodoroCount: number;
}

const defaultState: PomodoroState = {
    isRunning: false,
    remainingTime: 25 * 60, // Default to 25 minutes
    startTime: null,
    taskId: null,
    isBreak: false,
    pomodoroCount: 0,
};

export const PomodoroContext = createContext({
    ...defaultState,
    startTimer: (taskId: string) => {},
    pauseTimer: () => {},
    resetTimer: () => {},
    skipInterval: () => {},
    setRemainingTime: (time: number) => {},
} as any);

export const PomodoroProvider: React.FC<PomodoroContextProps> = ({
    children,
}) => {
    const [isRunning, setIsRunning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(defaultState.remainingTime);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [isBreak, setIsBreak] = useState(false);
    const [pomodoroCount, setPomodoroCount] = useState(0);

    const timerRef = useRef<number | null>(null);

    // Load state from localStorage on mount
    useEffect(() => {
        const storedState = localStorage.getItem('pomodoroState');
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            setIsRunning(parsedState.isRunning);
            setRemainingTime(parsedState.remainingTime);
            setStartTime(parsedState.startTime);
            setTaskId(parsedState.taskId);
            setIsBreak(parsedState.isBreak);
            setPomodoroCount(parsedState.pomodoroCount);

            // If the timer was running, recalculate the remaining time
            if (parsedState.isRunning && parsedState.startTime) {
                const elapsedTime = Date.now() - parsedState.startTime;
                const newRemainingTime = Math.max(
                    0,
                    parsedState.remainingTime - Math.floor(elapsedTime / 1000)
                );
                setRemainingTime(newRemainingTime);
            }
        }
    }, []);

    // Save state to localStorage on changes
    useEffect(() => {
        localStorage.setItem(
            'pomodoroState',
            JSON.stringify({
                isRunning,
                remainingTime,
                startTime,
                taskId,
                isBreak,
                pomodoroCount,
            })
        );
    }, [isRunning, remainingTime, startTime, taskId, isBreak, pomodoroCount]);

    const startTimer = useCallback(
        (taskId: string) => {
            setIsRunning(true);
            setStartTime(Date.now());
            setTaskId(taskId);
        },
        []
    );

    const pauseTimer = useCallback(() => {
        setIsRunning(false);
        setStartTime(null);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, []);

    const resetTimer = useCallback(() => {
        setIsRunning(false);
        setRemainingTime(defaultState.remainingTime);
        setStartTime(null);
        setTaskId(null);
        setIsBreak(false);
        setPomodoroCount(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, []);

    const skipInterval = useCallback(() => {
        setIsRunning(false);
        setStartTime(null);
        setIsBreak(!isBreak);
        setRemainingTime(isBreak ? 25 * 60 : 5 * 60); // Reset to default values
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }, [isBreak]);

    const setContextRemainingTime = useCallback((time: number) => {
        setRemainingTime(time);
    }, []);

    const contextValue = {
        isRunning,
        remainingTime,
        startTime,
        taskId,
        isBreak,
        pomodoroCount,
        startTimer,
        pauseTimer,
        resetTimer,
        skipInterval,
        setRemainingTime: setContextRemainingTime,
    };

    return (
        <PomodoroContext.Provider value={contextValue}>
            {children}
        </PomodoroContext.Provider>
    );
};
