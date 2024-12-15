import React, { useEffect, useState } from 'react';
import { getGoals } from '@/lib/database';
import { LearningGoal } from '@/types';
import { Card } from '@/components/ui/card';

const GoalManager: React.FC = () => {
    const [goals, setGoals] = useState<LearningGoal[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const fetchedGoals = await getGoals();
                setGoals(fetchedGoals);
            } catch (error) {
                console.error('Error fetching goals:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGoals();
    }, []);

    if (loading) return <div>Loading goals...</div>;

    return (
        <div className="goal-manager">
            {goals.map((goal) => (
                <Card key={goal.id} className="goal-card">
                    <h3>{goal.title}</h3>
                    <p>Target Hours: {goal.targetHours}</p>
                    <p>Status: {goal.status}</p>
                    {/* Add more details as needed */}
                </Card>
            ))}
        </div>
    );
};

export default GoalManager;
