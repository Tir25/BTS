/**
 * Centralized notification system for the University Bus Tracking System
 * Provides consistent user feedback without using browser alerts
 */

import { logger } from './logger';

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

class NotificationManager {
  private static instance: NotificationManager;
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private nextId = 1;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Subscribe to notification changes
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notify(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Add a notification
  add(notification: Omit<Notification, 'id'>): string {
    const id = `notification-${this.nextId++}`;
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      persistent: false,
      ...notification,
    };

    this.notifications.push(newNotification);
    this.notify();

    // Auto-remove after duration (unless persistent)
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
    }

    logger.info(`Notification added: ${newNotification.type}`, 'notifications', {
      type: newNotification.type,
      title: newNotification.title,
    });

    return id;
  }

  // Remove a notification
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  // Clear all notifications
  clear(): void {
    this.notifications = [];
    this.notify();
  }

  // Get all notifications
  getAll(): Notification[] {
    return [...this.notifications];
  }

  // Convenience methods for different notification types
  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.SUCCESS,
      title,
      message,
      ...options,
    });
  }

  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.ERROR,
      title,
      message,
      persistent: true, // Errors should persist until dismissed
      ...options,
    });
  }

  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.WARNING,
      title,
      message,
      ...options,
    });
  }

  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.add({
      type: NotificationType.INFO,
      title,
      message,
      ...options,
    });
  }

  // Specific notification methods for common use cases
  authSuccess(message: string = 'Login successful'): string {
    return this.success('Authentication', message);
  }

  authError(message: string = 'Login failed'): string {
    return this.error('Authentication Error', message);
  }

  locationSuccess(message: string = 'Location updated'): string {
    return this.info('Location', message);
  }

  locationError(message: string = 'Location access denied'): string {
    return this.error('Location Error', message, {
      actions: [
        {
          label: 'Enable Location',
          action: () => {
            // This would typically open browser settings or show instructions
            this.info('Location Access', 'Please enable location access in your browser settings');
          },
          style: 'primary',
        },
      ],
    });
  }

  websocketConnected(): string {
    return this.info('Connection', 'Real-time connection established');
  }

  websocketDisconnected(): string {
    return this.warning('Connection', 'Real-time connection lost. Attempting to reconnect...');
  }

  websocketError(message: string = 'Connection error'): string {
    return this.error('Connection Error', message);
  }

  mapError(message: string = 'Map failed to load'): string {
    return this.error('Map Error', message, {
      actions: [
        {
          label: 'Reload',
          action: () => window.location.reload(),
          style: 'primary',
        },
      ],
    });
  }

  storageError(message: string = 'Unable to save data'): string {
    return this.error('Storage Error', message);
  }

  apiError(message: string = 'Request failed'): string {
    return this.error('Request Error', message);
  }

  networkError(): string {
    return this.error('Network Error', 'Please check your internet connection and try again', {
      actions: [
        {
          label: 'Retry',
          action: () => window.location.reload(),
          style: 'primary',
        },
      ],
    });
  }

  permissionDenied(resource: string = 'this resource'): string {
    return this.error('Access Denied', `You don't have permission to access ${resource}`);
  }

  validationError(message: string): string {
    return this.warning('Validation Error', message);
  }

  fileUploadSuccess(filename: string): string {
    return this.success('Upload Complete', `${filename} uploaded successfully`);
  }

  fileUploadError(filename: string, error: string): string {
    return this.error('Upload Failed', `Failed to upload ${filename}: ${error}`);
  }

  busTrackingStarted(busCode: string): string {
    return this.success('Tracking Started', `Now tracking bus ${busCode}`);
  }

  busTrackingStopped(busCode: string): string {
    return this.info('Tracking Stopped', `Stopped tracking bus ${busCode}`);
  }
}

// Export singleton instance
export const notifications = NotificationManager.getInstance();

// Export convenience functions
export const notifySuccess = (title: string, message: string, options?: Partial<Notification>) =>
  notifications.success(title, message, options);

export const notifyError = (title: string, message: string, options?: Partial<Notification>) =>
  notifications.error(title, message, options);

export const notifyWarning = (title: string, message: string, options?: Partial<Notification>) =>
  notifications.warning(title, message, options);

export const notifyInfo = (title: string, message: string, options?: Partial<Notification>) =>
  notifications.info(title, message, options);

// Export specific notification functions
export const notifyAuthSuccess = (message?: string) => notifications.authSuccess(message);
export const notifyAuthError = (message?: string) => notifications.authError(message);
export const notifyLocationSuccess = (message?: string) => notifications.locationSuccess(message);
export const notifyLocationError = (message?: string) => notifications.locationError(message);
export const notifyWebSocketConnected = () => notifications.websocketConnected();
export const notifyWebSocketDisconnected = () => notifications.websocketDisconnected();
export const notifyWebSocketError = (message?: string) => notifications.websocketError(message);
export const notifyMapError = (message?: string) => notifications.mapError(message);
export const notifyStorageError = (message?: string) => notifications.storageError(message);
export const notifyApiError = (message?: string) => notifications.apiError(message);
export const notifyNetworkError = () => notifications.networkError();
export const notifyPermissionDenied = (resource?: string) => notifications.permissionDenied(resource);
export const notifyValidationError = (message: string) => notifications.validationError(message);
export const notifyFileUploadSuccess = (filename: string) => notifications.fileUploadSuccess(filename);
export const notifyFileUploadError = (filename: string, error: string) => notifications.fileUploadError(filename, error);
export const notifyBusTrackingStarted = (busCode: string) => notifications.busTrackingStarted(busCode);
export const notifyBusTrackingStopped = (busCode: string) => notifications.busTrackingStopped(busCode);
