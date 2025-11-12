import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';

import { logger } from '../../utils/logger';

export interface RealtimeSubscription {
  id: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: any) => void;
}

export interface RealtimeConfig {
  enabled: boolean;
  tables: string[];
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: string;
}

class SupabaseRealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private channels: Map<string, RealtimeChannel> = new Map();
  private isEnabled: boolean = true;
  // Reconnection properties (for future use)
  // private reconnectAttempts: number = 0;
  // private maxReconnectAttempts: number = 5;
  // private reconnectDelay: number = 1000;

  constructor() {
    this.initializeRealtime();
  }

  private async initializeRealtime(): Promise<void> {
    try {
      // Enable realtime for specific tables
      await this.enableRealtimeForTables([
        'live_locations',
        'bus_locations_live',
        'buses',
        'routes',
        'driver_bus_assignments',
      ]);

      logger.info('✅ Supabase Realtime initialized', 'component');
    } catch (error) {
      logger.error('Error occurred', 'component', { error });
    }
  }

  private async enableRealtimeForTables(tables: string[]): Promise<void> {
    // Note: In production, this would be done via Supabase dashboard or API
    // For now, we'll assume realtime is enabled for these tables
    logger.debug('Debug info', 'component', { data: '🔧 Enabling realtime for tables:', tables });
  }

  // Subscribe to bus location updates
  subscribeToBusLocations(
    callback: (payload: any) => void,
    filter?: string
  ): string {
    const subscriptionId = `bus-locations-${Date.now()}`;

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      table: 'live_locations',
      event: '*',
      filter,
      callback,
    };

    this.subscriptions.set(subscriptionId, subscription);

    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
          filter,
        },
        (payload: unknown) => {
          logger.debug('Debug info', 'component', { data: '📍 Bus location update via Supabase Realtime:', payload });
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('Debug info', 'component', { data: `🔌 Supabase Realtime subscription status for ${subscriptionId}: ${status}` });
        if (status === 'SUBSCRIBED') {
          this.channels.set(subscriptionId, channel);
        }
      });

    return subscriptionId;
  }

  // Subscribe to bus information updates
  subscribeToBusUpdates(
    callback: (payload: any) => void,
    filter?: string
  ): string {
    const subscriptionId = `bus-updates-${Date.now()}`;

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      table: 'buses',
      event: '*',
      filter,
      callback,
    };

    this.subscriptions.set(subscriptionId, subscription);

    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'buses',
          filter,
        },
        (payload: unknown) => {
          logger.debug('Debug info', 'component', { data: '🚌 Bus update via Supabase Realtime:', payload });
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('Debug info', 'component', { data: `🔌 Supabase Realtime subscription status for ${subscriptionId}: ${status}` });
        if (status === 'SUBSCRIBED') {
          this.channels.set(subscriptionId, channel);
        }
      });

    return subscriptionId;
  }

  // Subscribe to route updates
  subscribeToRouteUpdates(
    callback: (payload: any) => void,
    filter?: string
  ): string {
    const subscriptionId = `route-updates-${Date.now()}`;

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      table: 'routes',
      event: '*',
      filter,
      callback,
    };

    this.subscriptions.set(subscriptionId, subscription);

    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'routes',
          filter,
        },
        (payload: unknown) => {
          logger.debug('Debug info', 'component', { data: '🛣️ Route update via Supabase Realtime:', payload });
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('Debug info', 'component', { data: `🔌 Supabase Realtime subscription status for ${subscriptionId}: ${status}` });
        if (status === 'SUBSCRIBED') {
          this.channels.set(subscriptionId, channel);
        }
      });

    return subscriptionId;
  }

  // Subscribe to driver assignments
  subscribeToDriverAssignments(
    callback: (payload: any) => void,
    filter?: string
  ): string {
    const subscriptionId = `driver-assignments-${Date.now()}`;

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      table: 'driver_bus_assignments',
      event: '*',
      filter,
      callback,
    };

    this.subscriptions.set(subscriptionId, subscription);

    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'driver_bus_assignments',
          filter,
        },
        (payload: unknown) => {
          logger.debug('Debug info', 'component', { data: '👨‍💼 Driver assignment update via Supabase Realtime:', payload });
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('Debug info', 'component', { data: `🔌 Supabase Realtime subscription status for ${subscriptionId}: ${status}` });
        if (status === 'SUBSCRIBED') {
          this.channels.set(subscriptionId, channel);
        }
      });

    return subscriptionId;
  }

  // Generic subscription method
  subscribe(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: any) => void,
    filter?: string
  ): string {
    const subscriptionId = `${table}-${event}-${Date.now()}`;

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      table,
      event,
      filter,
      callback,
    };

    this.subscriptions.set(subscriptionId, subscription);

    const channel = supabase
      .channel(subscriptionId)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload: unknown) => {
          logger.debug('Debug info', 'component', { data: `📊 ${table} ${event} via Supabase Realtime:`, payload });
          callback(payload);
        }
      )
      .subscribe((status: string) => {
        logger.debug('Debug info', 'component', { data: `🔌 Supabase Realtime subscription status for ${subscriptionId}: ${status}` });
        if (status === 'SUBSCRIBED') {
          this.channels.set(subscriptionId, channel);
        }
      });

    return subscriptionId;
  }

  // Unsubscribe from a specific subscription
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    const channel = this.channels.get(subscriptionId);

    if (subscription && channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionId);
      this.channels.delete(subscriptionId);
      logger.info('🔌 Unsubscribed from subscription', 'component', { data: subscriptionId });
      return true;
    }

    return false;
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    for (const [subscriptionId] of this.subscriptions) {
      this.unsubscribe(subscriptionId);
    }
  }

  // Get subscription status
  getSubscriptionStatus(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
  }

  // Get all active subscriptions
  getActiveSubscriptions(): RealtimeSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // Enable/disable realtime
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.unsubscribeAll();
    }
  }

  // Check if realtime is enabled
  isRealtimeEnabled(): boolean {
    return this.isEnabled;
  }

  // Health check for realtime connections
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const activeSubscriptions = this.getActiveSubscriptions();
      const healthy = this.isEnabled && activeSubscriptions.length > 0;

      return {
        healthy,
        details: {
          enabled: this.isEnabled,
          activeSubscriptions: activeSubscriptions.length,
          subscriptions: activeSubscriptions.map((sub) => ({
            id: sub.id,
            table: sub.table,
            event: sub.event,
          })),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // Cleanup
  destroy(): void {
    this.unsubscribeAll();
    this.subscriptions.clear();
    this.channels.clear();
  }
}

export const supabaseRealtimeService = new SupabaseRealtimeService();
export default supabaseRealtimeService;
