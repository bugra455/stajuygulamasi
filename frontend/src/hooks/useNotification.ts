import { useState, useEffect } from 'react';
import type { NotificationState } from '../types/common';

export const useNotification = (duration: number = 3000) => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, duration]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  return { notification, showNotification, clearNotification: () => setNotification(null) };
};
