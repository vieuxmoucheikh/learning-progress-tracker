import React, { useState } from 'react';

interface SwitchProps {
  id: string;
  checked: boolean;
  isOn: boolean;
  handleToggle: () => void;
  onColor: string;
}

const Switch: React.FC<SwitchProps> = ({ id, isOn, handleToggle, onColor, checked }) => {
  return (
    <span style={{ display: 'flex', alignItems: 'center' }}>
      <input
        checked={checked}
        onChange={handleToggle}
        className="react-switch-checkbox" 
        id={id}
        type="checkbox"
      />
      <label
        style={{ background: isOn ? onColor : '#ccc' }}
        className="react-switch-label"
        htmlFor={id}
      >
        <span className={`react-switch-button`} />
      </label>
    </span>
  );
};

export default Switch;
