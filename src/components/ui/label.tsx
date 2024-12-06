import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
}

const Label: React.FC<LabelProps> = ({ children, htmlFor }) => {
  return <label htmlFor={htmlFor}>{children}</label>;
};

export default Label;
 