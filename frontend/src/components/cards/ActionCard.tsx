import React from 'react';
import SecureLink from '../../components/SecureLink';

const ActionCard = ({ icon, title, description, color, href = "#", requiredRoles = [] }: { 
  icon: React.ReactElement, 
  title: string, 
  description: string, 
  color: string, 
  href?: string,
  requiredRoles?: string[]
}) => {
  const cardBorderStyle = {
    borderColor: `var(--color-${color}-500)`,
  };

  const iconTextStyle = {
    color: `var(--color-${color}-600)`,
  };

  return (
    <SecureLink
      to={href}
      requiredRoles={requiredRoles}
      className={'block bg-background-50 p-6 rounded-lg shadow-md transition hover:shadow-lg hover:-translate-y-1 border-l-4'}
      style={cardBorderStyle}
    >
      <div
        className={`mb-4`}
        style={iconTextStyle}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-text-dark mb-2">{title}</h3>
      <p className="text-sm text-text-light">{description}</p>
    </SecureLink>
  );
};

export default ActionCard;