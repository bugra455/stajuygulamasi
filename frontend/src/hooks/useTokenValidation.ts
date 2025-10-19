import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export const useTokenValidation = () => {
  const { user, token, logout } = useAuth();

  const validateTokenAndRole = async (requiredRole?: string[]): Promise<boolean> => {
    try {
      // Token yoksa false döndür
      if (!token || !user) {
        console.warn('Token veya kullanıcı bilgisi bulunamadı');
        logout();
        return false;
      }

      // API ile token'ı doğrula
      const isValidToken = await api.validateToken();
      if (!isValidToken) {
        console.warn('Token geçersiz');
        logout();
        return false;
      }

      // Rol kontrolü (eğer belirtilmişse)
      if (requiredRole && requiredRole.length > 0) {
        const userRole = user.userType;
        if (!requiredRole.includes(userRole)) {
          console.warn(`Yetkisiz erişim: Gerekli rol ${requiredRole.join(', ')}, mevcut rol: ${userRole}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Token doğrulama hatası:', error);
      logout();
      return false;
    }
  };

  return { validateTokenAndRole };
};
