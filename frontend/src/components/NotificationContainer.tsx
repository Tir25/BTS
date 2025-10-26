import React, { useState, useEffect } from 'react';
import { notifications, Notification, NotificationType } from '../utils/notifications';
import { logger } from '../utils/logger';

interface NotificationContainerProps {
  className?: string;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ className = '' }) => {
  const [notificationList, setNotificationList] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notifications.subscribe(setNotificationList);
    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    notifications.remove(id);
    logger.debug('Notification dismissed', 'NotificationContainer', { data: id });
  };

  const handleAction = (action: () => void) => {
    action();
  };

  const getNotificationStyles = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'bg-green-500/90 text-white border-green-400';
      case NotificationType.ERROR:
        return 'bg-red-500/90 text-white border-red-400';
      case NotificationType.WARNING:
        return 'bg-yellow-500/90 text-white border-yellow-400';
      case NotificationType.INFO:
        return 'bg-blue-500/90 text-white border-blue-400';
      default:
        return 'bg-gray-500/90 text-white border-gray-400';
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case NotificationType.ERROR:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case NotificationType.WARNING:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case NotificationType.INFO:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (notificationList.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full ${className}`}>
      {notificationList.map((notification) => (
        <div
          key={notification.id}
          className={`
            relative flex items-start p-4 rounded-lg border backdrop-blur-sm
            ${getNotificationStyles(notification.type)}
            animate-in slide-in-from-right-full duration-300
          `}
        >
          <div className="flex-shrink-0 mr-3">
            {getIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1">
              {notification.title}
            </h4>
            <p className="text-sm opacity-90">
              {notification.message}
            </p>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action)}
                    className={`
                      px-3 py-1 text-xs font-medium rounded transition-colors
                      ${action.style === 'primary' 
                        ? 'bg-white/20 hover:bg-white/30' 
                        : action.style === 'danger'
                        ? 'bg-red-600/20 hover:bg-red-600/30'
                        : 'bg-white/10 hover:bg-white/20'
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleDismiss(notification.id)}
            className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
