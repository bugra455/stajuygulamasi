import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, fullWidth = false }) => {
  const { user } = useAuth();

  // Check if user is admin
  if (!user || user.userType !== 'YONETICI') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Paneli</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Hoş geldiniz, {user.name}
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className={`${fullWidth ? 'w-full' : 'max-w-9xl mx-auto'} py-6 sm:px-6 lg:px-8 overflow-scroll`}>
        {children}
      </main>
    </div>
  );
};
