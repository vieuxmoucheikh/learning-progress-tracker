import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Progress from '@/components/ui/progress';
import {
    Timer,
    Flame,
    Trophy,
    Clock
} from 'lucide-react';
import type { PomodoroStats as PomodoroStatsType } from '@/types';

interface PomodoroStatsProps {
    stats: PomodoroStatsType;
}

export function PomodoroStats({ stats }: PomodoroStatsProps) {
    return (
        <div className="w-full space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    icon={<Timer className="h-4 w-4" />}
                    title="Today's Focus"
                    value={`${Math.round(stats.totalWorkMinutes)} min`}
                    description="Total focus time"
                />
                <StatCard
                    icon={<Flame className="h-4 w-4" />}
                    title="Current Streak"
                    value={`${stats.currentStreak} days`}
                    description="Keep it up!"
                />
            </div>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Completed</span>
                            <span className="text-muted-foreground">
                                {stats.completedPomodoros} / {stats.totalPomodoros} Pomodoros
                            </span>
                        </div>
                        <Progress
                            value={(stats.completedPomodoros / (stats.totalPomodoros || 1)) * 100}
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    icon={<Trophy className="h-4 w-4" />}
                    title="Longest Streak"
                    value={`${stats.longestStreak} days`}
                    description="Personal best"
                />
                <StatCard
                    icon={<Clock className="h-4 w-4" />}
                    title="Most Productive"
                    value={stats.mostProductiveTime}
                    description="Peak focus time"
                />
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    description: string;
}

function StatCard({ icon, title, value, description }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}




