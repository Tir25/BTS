import { logger } from '../../utils/logger';

// Real-time Manager for Bus Tracking System
// Centralized management of all real-time services

export interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  source: 'websocket' | 'sse' | 'supabase';
}

export interface RealtimeHealth {
  isHealthy: boolean;
  services: {
    websocket: boolean;
    sse: boolean;
    supabase: boolean;
  };
  connections: {
    total: number;
    active: number;
    failed: number;
  };
  lastActivity: string;
}

class RealtimeManager {
  private events: RealtimeEvent[] = [];
  private maxEvents: number = 1000;
  private health: RealtimeHealth;
  private eventListeners: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();

  constructor() {
    this.health = {
      isHealthy: false,
      services: {
        websocket: false,
        sse: false,
        supabase: false
      },
      connections: {
        total: 0,
        active: 0,
        failed: 0
      },
      lastActivity: new Date().toISOString()
    };
  }

  // Add a new real-time event
  addEvent(event: Omit<RealtimeEvent, 'id' | 'timestamp'>): RealtimeEvent {
    const newEvent: RealtimeEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    this.events.push(newEvent);
    
    // Keep only the latest events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update health
    this.updateHealth();
    
    // Notify listeners
    this.notifyListeners(event.type, newEvent);

    return newEvent;
  }

  // Get recent events
  getRecentEvents(limit: number = 50): RealtimeEvent[] {
    return this.events.slice(-limit);
  }

  // Get events by type
  getEventsByType(type: string): RealtimeEvent[] {
    return this.events.filter(event => event.type === type);
  }

  // Subscribe to events
  subscribe(eventType: string, callback: (event: RealtimeEvent) => void): string {
    const subscriptionId = this.generateEventId();
    
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    this.eventListeners.get(eventType)!.push(callback);
    
    return subscriptionId;
  }

  // Unsubscribe from events
  unsubscribe(eventType: string, subscriptionId: string): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.findIndex(callback => 
        (callback as any).subscriptionId === subscriptionId
      );
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Update service health
  updateServiceHealth(service: keyof RealtimeHealth['services'], isHealthy: boolean): void {
    this.health.services[service] = isHealthy;
    this.updateHealth();
  }

  // Update connection stats
  updateConnectionStats(stats: Partial<RealtimeHealth['connections']>): void {
    this.health.connections = {
      ...this.health.connections,
      ...stats
    };
    this.updateHealth();
  }

  // Get current health status
  getHealth(): RealtimeHealth {
    return { ...this.health };
  }

  // Check if real-time services are healthy
  isHealthy(): boolean {
    return this.health.isHealthy;
  }

  // Get event statistics
  getEventStats() {
    const eventTypes = new Map<string, number>();
    
    for (const event of this.events) {
      const count = eventTypes.get(event.type) || 0;
      eventTypes.set(event.type, count + 1);
    }

    return {
      totalEvents: this.events.length,
      eventTypes: Object.fromEntries(eventTypes),
      lastActivity: this.health.lastActivity
    };
  }

  // Clear old events
  clearOldEvents(olderThan: Date): void {
    this.events = this.events.filter(event => 
      new Date(event.timestamp) > olderThan
    );
  }

  // Reset manager
  reset(): void {
    this.events = [];
    this.eventListeners.clear();
    this.health = {
      isHealthy: false,
      services: {
        websocket: false,
        sse: false,
        supabase: false
      },
      connections: {
        total: 0,
        active: 0,
        failed: 0
      },
      lastActivity: new Date().toISOString()
    };
  }

  // Private methods
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateHealth(): void {
    const servicesHealthy = Object.values(this.health.services).some(healthy => healthy);
    const connectionsHealthy = this.health.connections.active > 0;
    
    this.health.isHealthy = servicesHealthy && connectionsHealthy;
    this.health.lastActivity = new Date().toISOString();
  }

  private notifyListeners(eventType: string, event: RealtimeEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          logger.error('Error occurred', 'component', { error });
        }
      });
    }
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Export class for custom instances
export default RealtimeManager;
