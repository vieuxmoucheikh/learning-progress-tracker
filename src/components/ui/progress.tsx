import React from 'react';
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // Value of the progress, between 0 and 100
  className?: string; // Optional className for styling
}

const Progress: React.FC<ProgressProps> = ({ value, className }) => {
  return (
    <div className={cn("progress-bar w-full bg-gray-200 rounded-full", className)}>
      <div
        className="progress-bar__fill h-2 bg-primary rounded-full transition-all duration-200 ease-in-out"
        style={{
          width: `${value}%`
        }}
      />
    </div>
  );
};

export default Progress;
