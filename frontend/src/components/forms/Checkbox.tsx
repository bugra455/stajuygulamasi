import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, id, ...props }) => (
  <div className="flex items-center">
    <input
      id={id}
      type="checkbox"
      {...props}
      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-background-300 rounded"
    />
    <label htmlFor={id} className="ml-3 block text-sm text-text-dark">
      {label}
    </label>
  </div>
);

export default Checkbox;