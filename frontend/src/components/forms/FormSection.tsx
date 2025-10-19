import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children, className }) => (
  <div className="bg-background-50 p-6 rounded-lg shadow-md mb-8">
    <h2 className="text-xl font-bold text-primary-700 border-b border-background-200 pb-3 mb-6">{title}</h2>
    <div className={className || "grid grid-cols-1 md:grid-cols-2 gap-6"}>
      {children}
    </div>
  </div>
);

export default FormSection;