import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DanismanPasswordGuardProps {
  children: React.ReactNode;
}

const DanismanPasswordGuard: React.FC<DanismanPasswordGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Auth yüklenene kadar bekle
    if (isLoading) return;
    
    // Only check for advisors (DANISMAN)
    if (isAuthenticated && user?.userType === 'DANISMAN') {
      // If girisYapti is not 1 (null, 0, or any other value), redirect to password change
      if (user.girisYapti !== 1) {
        navigate('/parola-degistir');
        return;
      }
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  // Auth yüklenirken loading göster
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Show loading or redirect in progress
  if (isAuthenticated && user?.userType === 'DANISMAN' && user.girisYapti !== 1) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Parola değiştirme sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default DanismanPasswordGuard;