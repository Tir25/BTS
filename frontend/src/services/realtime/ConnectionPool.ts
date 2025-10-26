// Connection Pool for Real-time Services
// Manages multiple real-time connections efficiently

export interface ConnectionStatus {
  isConnected: boolean;
  connectionId: string;
  lastActivity: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface ConnectionConfig {
  maxConnections: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  connectionTimeout: number;
}

class ConnectionPool {
  private connections: Map<string, ConnectionStatus> = new Map();
  private config: ConnectionConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      maxConnections: 10,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      ...config
    };
  }

  // Add a new connection to the pool
  addConnection(connectionId: string): ConnectionStatus {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Connection pool is full');
    }

    const status: ConnectionStatus = {
      isConnected: true,
      connectionId,
      lastActivity: new Date().toISOString(),
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts
    };

    this.connections.set(connectionId, status);
    return status;
  }

  // Remove a connection from the pool
  removeConnection(connectionId: string): boolean {
    return this.connections.delete(connectionId);
  }

  // Get connection status
  getConnectionStatus(connectionId: string): ConnectionStatus | undefined {
    return this.connections.get(connectionId);
  }

  // Update connection activity
  updateActivity(connectionId: string): void {
    const status = this.connections.get(connectionId);
    if (status) {
      status.lastActivity = new Date().toISOString();
      this.connections.set(connectionId, status);
    }
  }

  // Mark connection as disconnected
  markDisconnected(connectionId: string): void {
    const status = this.connections.get(connectionId);
    if (status) {
      status.isConnected = false;
      status.reconnectAttempts++;
      this.connections.set(connectionId, status);
    }
  }

  // Get all connections
  getAllConnections(): Map<string, ConnectionStatus> {
    return new Map(this.connections);
  }

  // Get connection count
  getConnectionCount(): number {
    return this.connections.size;
  }

  // Get active connections
  getActiveConnections(): ConnectionStatus[] {
    return Array.from(this.connections.values()).filter(conn => conn.isConnected);
  }

  // Start heartbeat monitoring
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = this.config.heartbeatInterval;

      for (const [connectionId, status] of this.connections) {
        const lastActivity = new Date(status.lastActivity);
        const timeDiff = now.getTime() - lastActivity.getTime();

        if (timeDiff > timeout) {
          this.markDisconnected(connectionId);
        }
      }
    }, this.config.heartbeatInterval);
  }

  // Stop heartbeat monitoring
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Clear all connections
  clear(): void {
    this.connections.clear();
  }

  // Get pool statistics
  getStats() {
    const active = this.getActiveConnections().length;
    const total = this.connections.size;
    
    return {
      total,
      active,
      inactive: total - active,
      maxConnections: this.config.maxConnections,
      utilization: (total / this.config.maxConnections) * 100
    };
  }
}

// Export singleton instance
export const connectionPool = new ConnectionPool();

// Export class for custom instances
export default ConnectionPool;
