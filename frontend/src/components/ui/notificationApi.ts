export const showNotification = (notification: { message: string; type?: string; duration?: number }) => {
  console.log('[Notification]', notification.type || 'info', notification.message);
};
