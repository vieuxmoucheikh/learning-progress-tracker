import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface FocusData {
  category: string;
  value: number;
}

interface LearningFocusChartProps {
  data: FocusData[];
}

export function LearningFocusChart({ data }: LearningFocusChartProps) {
  return (
    <div className="w-full h-[300px] bg-white rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Learning Focus</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" />
          <PolarRadiusAxis angle={30} domain={[0, 1]} />
          <Radar
            name="Focus Areas"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
