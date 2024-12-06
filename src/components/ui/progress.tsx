import React from 'react';

interface ProgressProps {
  value: number; // Value of the progress, between 0 and 100
}

const Progress: React.FC<ProgressProps> = ({ value }) => {
  return (
    <div className="progress-bar" style={{ width: '100%', backgroundColor: '#e0e0e0' }}>
      <div
        className="progress-bar__fill"
        style={{
          width: `${value}%`,
          backgroundColor: '#76c7c0',
          height: '100%',
          transition: 'width 0.2s ease-in-out',
        }}
      />
    </div>
  ); 
};

export { Progress as default };
