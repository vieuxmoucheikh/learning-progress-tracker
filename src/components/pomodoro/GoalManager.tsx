import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addGoal } from '@/lib/database';
import { LearningGoal } from '@/types';

const GoalManager: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [title, setTitle] = useState('');
  const [targetHours, setTargetHours] = useState(0);

  const handleAddGoal = async () => {
    if (!title || targetHours <= 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (!date) {
      alert('Please select a valid target date');
      return;
    }
    
    const newGoal: LearningGoal = {
      id: crypto.randomUUID(),
      userId: 'current-user-id', // TODO: Replace with actual user ID
      title,
      targetHours,
      targetDate: date.toISOString(),
      status: 'active',
      category: 'general',
      priority: 'medium',
      createdAt: new Date().toISOString()
    };

    try {
      await addGoal(newGoal);
      // Refresh goals list or show success message
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="default">Add New Goal</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hours" className="text-right">
                Target Hours
              </Label>
              <Input
                id="hours"
                type="number"
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => {
                    if (date) {
                      setDate(date);
                    }
                  }}
                  className="rounded-md border"
                  required
                  initialFocus
                />
              </div>
            </div>
          </div>
          <Button onClick={handleAddGoal}>Add Goal</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalManager;
