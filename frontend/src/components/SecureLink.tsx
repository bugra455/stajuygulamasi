import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useTokenValidation } from '../hooks/useTokenValidation';

interface SecureLinkProps extends LinkProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const SecureLink: React.FC<SecureLinkProps> = ({
  children,
  requiredRoles = [],
  onClick,
  ...props
}) => {
  const { validateTokenAndRole } = useTokenValidation();

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Token ve rol validasyonu
    const isValid = await validateTokenAndRole(requiredRoles);
    if (!isValid) {
      event.preventDefault();
      return;
    }

    // Validasyon başarılıysa orijinal onClick handler'ını çağır
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default SecureLink;
