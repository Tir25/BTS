import { Socket } from 'socket.io-client';
import { logger } from '../../utils/logger';

/**
 * Subscription manager for WebSocket
 * Handles bus and route subscriptions for efficient broadcasting
 */
export class SubscriptionManager {
  private socket: Socket | null = null;

  /**
   * Set socket instance
   */
  setSocket(socket: Socket | null): void {
    this.socket = socket;
  }

  /**
   * Subscribe to specific buses for efficient broadcasting
   */
  subscribeToBuses(busIds: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('⚠️ Cannot subscribe: WebSocket not connected', 'component');
      return;
    }

    if (busIds.length === 0) {
      logger.debug('📍 No buses to subscribe to', 'component');
      return;
    }

    try {
      this.socket.emit('subscribe:bus', busIds);
      logger.info('✅ Subscribed to buses', 'component', { 
        count: busIds.length,
        busIds: busIds.slice(0, 5) // Log first 5 for debugging
      });
    } catch (error) {
      logger.error('❌ Error subscribing to buses', 'component', { error });
    }
  }

  /**
   * Subscribe to specific routes for efficient broadcasting
   */
  subscribeToRoutes(routeIds: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('⚠️ Cannot subscribe: WebSocket not connected', 'component');
      return;
    }

    if (routeIds.length === 0) {
      logger.debug('📍 No routes to subscribe to', 'component');
      return;
    }

    try {
      this.socket.emit('subscribe:route', routeIds);
      logger.info('✅ Subscribed to routes', 'component', { 
        count: routeIds.length,
        routeIds: routeIds.slice(0, 5) // Log first 5 for debugging
      });
    } catch (error) {
      logger.error('❌ Error subscribing to routes', 'component', { error });
    }
  }

  /**
   * Unsubscribe from buses
   */
  unsubscribeFromBuses(busIds: string[]): void {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit('unsubscribe:bus', busIds);
      logger.info('✅ Unsubscribed from buses', 'component', { count: busIds.length });
    } catch (error) {
      logger.error('❌ Error unsubscribing from buses', 'component', { error });
    }
  }

  /**
   * Unsubscribe from routes
   */
  unsubscribeFromRoutes(routeIds: string[]): void {
    if (!this.socket?.connected) return;

    try {
      this.socket.emit('unsubscribe:route', routeIds);
      logger.info('✅ Unsubscribed from routes', 'component', { count: routeIds.length });
    } catch (error) {
      logger.error('❌ Error unsubscribing from routes', 'component', { error });
    }
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

