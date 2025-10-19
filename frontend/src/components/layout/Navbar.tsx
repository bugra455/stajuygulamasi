import React from "react";
import { Link, useLocation } from "react-router-dom";
import type { User } from "../../context/AuthContext";
import SecureButton from "../../components/SecureButton";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useTranslation } from "../../hooks/useTranslation";

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const { t } = useTranslation();

  // Kullanıcıya göre yönlendirme yolu
  let linkPath = "/";
  if (user?.userType === "DANISMAN") {
    linkPath = "/danisman-panel";
  } else if (user?.userType === "OGRENCI") {
    linkPath = "/ogrenci-panel";
  } else if (user?.userType === "KARIYER_MERKEZI") {
    linkPath = "/kariyer-panel";
  }

  const location = useLocation();

  // Hide language switcher for Kariyer and Danisman panels
  const hideLanguageSwitcher = location.pathname.startsWith('/kariyer-panel') || location.pathname.startsWith('/danisman-panel');

  return (
    <header className="bg-background-50 shadow-sm">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-8 lg:px-8 flex justify-between items-center">
        <Link
          to={linkPath}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <img src="/kirmizi.svg" alt="Logo" className="h-12" />
        </Link>
        <div className="text-right flex items-center space-x-4">
          {!hideLanguageSwitcher && <LanguageSwitcher />}
          <div>
            <p className="text-[10px] sm:text-sm font-semibold text-text-dark">
              {user?.name || t("common.user")}
            </p>
            <p className="text-[10px] sm:text-sm text-text-light">
              {user?.userType || t("common.unknown")}
            </p>
          </div>
          <SecureButton
            onClick={onLogout}
            className="sm:text-sm text-[10px] bg-primary-600 hover:bg-primary-700 text-white sm:px-3 py-1 rounded-md transition-colors"
          >
            {t("auth.logout")}
          </SecureButton>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
