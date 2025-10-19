import React from "react";
import { useTokenValidation } from "../hooks/useTokenValidation";
import { useTranslation } from "../hooks/useTranslation";

interface SecureButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  requiredRoles?: string[];
  loadingState?: boolean;
  className?: string;
}

const SecureButton: React.FC<SecureButtonProps> = ({
  children,
  onClick,
  requiredRoles = [],
  loadingState = false,
  className = "",
  disabled = false,
  ...props
}) => {
  const { validateTokenAndRole } = useTokenValidation();
  const { t } = useTranslation();

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // Buton disabled ise veya loading durumundaysa işlem yapma
    if (disabled || loadingState) return;

    // Token ve rol validasyonu
    const isValid = await validateTokenAndRole(requiredRoles);
    if (!isValid) {
      return;
    }

    // Validasyon başarılıysa orijinal onClick handler'ını çağır
    if (onClick) {
      onClick(event);
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled || loadingState}
      className={`${className} ${loadingState ? "opacity-75 cursor-not-allowed" : ""}`}
    >
      {loadingState ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {t("common.processing")}
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default SecureButton;
