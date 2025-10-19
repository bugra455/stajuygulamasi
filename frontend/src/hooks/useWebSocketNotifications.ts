import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';

interface NotificationData {
  type: 'excel_upload_complete' | 'excel_upload_failed' | 'progress_update' | 'upload_cancelled';
  dosyaId: number;
  message: string;
  data?: {
    totalRows?: number;
    successfulRows?: number;
    errorRows?: number;
    errors?: string[];
    percentage?: number;
    stage?: string;
  };
  timestamp: string;
}

interface UseWebSocketNotificationsResult {
  isConnected: boolean;
  lastNotification: NotificationData | null;
  notifications: NotificationData[];
  cancelCurrentUpload: () => void;
}

// Global notification handler for in-app notifications
let globalNotificationHandler: ((message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void) | null = null;

export const setGlobalNotificationHandler = (handler: typeof globalNotificationHandler) => {
  globalNotificationHandler = handler;
};

export const useWebSocketNotifications = (): UseWebSocketNotificationsResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUploadRef = useRef<number | null>(null);

  const cancelCurrentUpload = useCallback(async () => {
    console.log('🚫 [Hook] Cancel upload called, currentUploadRef:', currentUploadRef.current);
    if (currentUploadRef.current) {
      const dosyaId = currentUploadRef.current;
      
      try {
        // Send cancellation via WebSocket if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('🚫 [Hook] Sending cancel_upload WebSocket message for dosyaId:', dosyaId);
          wsRef.current.send(JSON.stringify({
            type: 'cancel_upload',
            dosyaId: dosyaId
          }));
        } else {
          console.log('🚫 [Hook] WebSocket not available, skipping WebSocket cancel');
        }
        
        // Also send REST API cancel request as backup
        console.log('🚫 [Hook] Sending REST API cancel request for dosyaId:', dosyaId);
        await api.cancelExcelUpload(dosyaId);
        console.log('✅ [Hook] REST API cancel request successful');
        
      } catch (error: unknown) {
        console.error('❌ [Hook] Error cancelling upload:', error instanceof Error ? error.message : 'Unknown error');
        // Don't throw error here, just log it - cancellation might still work via WebSocket
      }
      
      currentUploadRef.current = null;
    } else {
      console.log('🚫 [Hook] Cannot cancel - no current upload tracked');
    }
  }, []);

  const getWebSocketUrl = useCallback(() => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      return `${protocol}//${host}:3001`;
    }
    return 'ws://localhost:3001';
  }, []);

  const showInAppNotification = useCallback((notification: NotificationData) => {
    if (globalNotificationHandler) {
      let type: 'info' | 'success' | 'error' | 'warning' = 'info';
      let duration = 5000;

      switch (notification.type) {
        case 'excel_upload_complete':
          type = 'success';
          duration = 8000;
          break;
        case 'excel_upload_failed':
          type = 'error';
          duration = 10000;
          break;
        case 'progress_update':
          type = 'info';
          duration = 4000;
          // Track upload for cancellation - track both uploading and processing stages
          if (notification.data?.stage === 'uploading' || notification.data?.stage === 'processing') {
            console.log('📊 [Hook] Setting currentUploadRef to:', notification.dosyaId, 'stage:', notification.data?.stage);
            currentUploadRef.current = notification.dosyaId;
          }
          break;
        case 'upload_cancelled':
          type = 'warning';
          duration = 5000;
          currentUploadRef.current = null;
          break;
      }

      globalNotificationHandler(notification.message, type, duration);
    } else {
      console.log('📬 WebSocket Notification:', notification.message);
    }
  }, []);

  const createNotification = useCallback((notification: NotificationData) => {
    const title = notification.type === 'excel_upload_complete' 
      ? '✅ Excel Yükleme Tamamlandı'
      : notification.type === 'excel_upload_failed'
      ? '❌ Excel Yükleme Hatası'
      : '📋 Excel İşlem Güncellemesi';
    
    const options = {
      body: notification.message,
      icon: '/favicon.ico',
      tag: `excel-${notification.dosyaId}`, // Prevent duplicate notifications
      requireInteraction: notification.type !== 'progress_update'
    };

    new Notification(title, options);
  }, []);

  const showBrowserNotification = useCallback((notification: NotificationData) => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          createNotification(notification);
        }
      });
    } else if (Notification.permission === 'granted') {
      createNotification(notification);
    }
  }, [createNotification]);

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = getWebSocketUrl();
        console.log('🔌 [WS] Connecting to:', wsUrl);
        
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('✅ [WS] Connected to notification server');
          setIsConnected(true);
          // Clear any existing reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        wsRef.current.onmessage = (event) => {
          try {
            const notification: NotificationData = JSON.parse(event.data);
            console.log('📬 [WS] Notification received:', notification);
            
            setLastNotification(notification);
            setNotifications(prev => [...prev, notification].slice(-50)); // Keep last 50 notifications
            
            // Show in-app notification
            showInAppNotification(notification);
            
            // Show browser notification for important events
            if (notification.type === 'excel_upload_complete' || notification.type === 'excel_upload_failed') {
              showBrowserNotification(notification);
            }
          } catch (error) {
            console.error('❌ [WS] Failed to parse notification:', error);
          }
        };

        wsRef.current.onclose = (event) => {
          console.log('🔌 [WS] Connection closed:', event.code, event.reason);
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 [WS] Attempting to reconnect...');
              connectWebSocket();
            }, 3000);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('❌ [WS] Connection error:', error);
          setIsConnected(false);
        };

      } catch (error) {
        console.error('❌ [WS] Failed to create WebSocket connection:', error);
      }
    };

    // Handle page unload to warn user but don't auto-cancel uploads
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if there's an active upload, but don't auto-cancel
      if (currentUploadRef.current) {
        e.preventDefault();
        e.returnValue = 'Excel dosyası yükleniyor. Sayfayı kapatmak upload işlemini durdurmayacak ama progress görüntüleyemeyeceksiniz.';
        return e.returnValue;
      }
    };

    // Removed auto-cancellation on visibility change to allow tab switching
    // Users can manually cancel if needed

    connectWebSocket();

    // Add event listeners for page lifecycle
    window.addEventListener('beforeunload', handleBeforeUnload);
    // Removed visibilitychange listener to allow tab switching without killing upload

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // No need to remove visibilitychange listener since we're not adding it
    };
  }, [getWebSocketUrl, showBrowserNotification, showInAppNotification, cancelCurrentUpload]);

  return {
    isConnected,
    lastNotification,
    notifications,
    cancelCurrentUpload
  };
};
