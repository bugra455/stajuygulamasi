import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

const FormInput: React.FC<FormInputProps> = ({ label, id, error, ...props }) => {
  const baseClasses = "block w-full px-3 py-2 border rounded-md shadow-sm placeholder-text-light focus:outline-none sm:text-sm disabled:bg-background-200 disabled:cursor-not-allowed";
  const errorClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";
  const normalClasses = "border-background-300 focus:ring-primary-500 focus:border-primary-500";

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-dark mb-2">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`${baseClasses} ${error ? errorClasses : normalClasses}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default FormInput;