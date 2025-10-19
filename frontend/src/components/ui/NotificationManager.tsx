import React from 'react';

interface NotificationManagerProps {
  children: React.ReactNode;
}

// Minimal no-op NotificationManager: keep UI tree unchanged
export const NotificationManager: React.FC<NotificationManagerProps> = ({ children }) => {
  return <>{children}</>;
};

export default NotificationManager;
