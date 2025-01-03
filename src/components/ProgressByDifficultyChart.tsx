import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProgressData {
  difficulty: string;
  count: number;
  progress: number;
}

interface ProgressByDifficultyChartProps {
  data: ProgressData[];
}

export function ProgressByDifficultyChart({ data }: ProgressByDifficultyChartProps) {
  return (
    <div className="w-full h-[300px] bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Progress by Difficulty</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="difficulty" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#ff6b6b" name="Number of Items" />
          <Bar dataKey="progress" fill="#4dabf7" name="Avg. Progress %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
