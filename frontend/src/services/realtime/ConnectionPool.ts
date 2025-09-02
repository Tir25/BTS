import { io, Socket } from 'socket.io-client';
import { environment } from '../../config/environment';
import { logError } from '../../utils/errorHandler';

export interface ConnectionConfig {
  name: string;
  url: string;
  options?: any;
  priority: 'high' | 'medium' | 'low';
  autoReconnect: boolean;
  maxReconnectAttempts: number;
}

export interface ConnectionStatus {
  name: string;
  isConnected: boolean;
  isConnecting: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
  error?: string;
}

class ConnectionPool {
  private connections: Map<string, Socket> = new Map();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private connectionConfigs: Map<string, ConnectionConfig> = new Map();
  private eventListeners: Map<string, Map<string, ((...args: any[]) => void)[]>> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultConnections();
    this.startHealthCheck();
  }

  private initializeDefaultConnections(): void {
    // Don't initialize connections during construction
    // They will be initialized when needed
  }

  // Initialize connections when needed
  private ensureConnectionsInitialized(): void {
    if (this.connectionConfigs.size > 0) {
      return; // Already initialized
    }

    // Get WebSocket URL from environment or construct it from current window location
    let websocketUrl = environment.api.websocketUrl;
    
    // If no WebSocket URL is provided, try to construct one from the current window location
    if (!websocketUrl && typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '3000'; // Default backend port
      websocketUrl = `${protocol}//${host}:${port}`;
    }
    
    // Final fallback for development
    const finalWebsocketUrl = websocketUrl || 'ws://localhost:3000';
    
    console.log('🔌 Initializing WebSocket connections with URL:', finalWebsocketUrl);
    
    // High priority connection for critical location updates
    this.addConnection({
      name: 'location-updates',
      url: finalWebsocketUrl,
      priority: 'high',
      autoReconnect: true,
      maxReconnectAttempts: 15,
      options: {
        transports: ['websocket', 'polling'],
        timeout: 15000,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        query: {
          clientType: 'student',
          connectionType: 'location-updates',
          version: '1.0.0',
        },
      },
    });

    // Medium priority connection for general updates
    this.addConnection({
      name: 'general-updates',
      url: finalWebsocketUrl,
      priority: 'medium',
      autoReconnect: true,
      maxReconnectAttempts: 10,
      options: {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        query: {
          clientType: 'student',
          connectionType: 'general-updates',
          version: '1.0.0',
        },
      },
    });

    // Low priority connection for analytics and non-critical data
    this.addConnection({
      name: 'analytics',
      url: finalWebsocketUrl,
      priority: 'low',
      autoReconnect: false,
      maxReconnectAttempts: 3,
      options: {
        transports: ['polling'],
        timeout: 30000,
        reconnection: false,
        query: {
          clientType: 'student',
          connectionType: 'analytics',
          version: '1.0.0',
        },
      },
    });
  }

  addConnection(config: ConnectionConfig): void {
    this.connectionConfigs.set(config.name, config);
    this.connectionStatus.set(config.name, {
      name: config.name,
      isConnected: false,
      isConnecting: false,
      lastHeartbeat: 0,
      reconnectAttempts: 0,
    });
    this.eventListeners.set(config.name, new Map());
  }

  async connect(connectionName: string): Promise<void> {
    // Ensure connections are initialized
    this.ensureConnectionsInitialized();
    
    const config = this.connectionConfigs.get(connectionName);
    if (!config) {
      throw new Error(`Connection configuration not found: ${connectionName}`);
    }

    const existingSocket = this.connections.get(connectionName);
    if (existingSocket?.connected) {
      console.log(`🔌 Connection ${connectionName} already connected`);
      return;
    }

    const status = this.connectionStatus.get(connectionName)!;
    if (status.isConnecting) {
      console.log(`🔌 Connection ${connectionName} already connecting`);
      return;
    }

    try {
      status.isConnecting = true;
      console.log(`🔌 Connecting to ${connectionName}...`);

      // Add connection timeout with better error handling
      const connectionTimeout = setTimeout(() => {
        if (status.isConnecting) {
          console.warn(`⚠️ Connection timeout for ${connectionName}`);
          status.isConnecting = false;
          status.error = 'Connection timeout';
          
          // Log timeout error
          logError(new Error(`Connection timeout for ${connectionName}`), {
            service: 'websocket',
            operation: `connect-${connectionName}`,
          }, 'medium');
          
          // Attempt reconnection if auto-reconnect is enabled
          if (config.autoReconnect && status.reconnectAttempts < config.maxReconnectAttempts) {
            this.scheduleReconnect(connectionName);
          }
        }
      }, 15000); // Increased to 15 seconds for better reliability

      const socket = io(config.url, {
        ...config.options,
        timeout: 15000, // Increased timeout for better reliability
        forceNew: true,
        // Add additional options for better stability
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        // Add better error handling
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 10,
      });
      
      socket.on('connect', () => {
        console.log(`✅ Connected to ${connectionName}`);
        clearTimeout(connectionTimeout);
        status.isConnected = true;
        status.isConnecting = false;
        status.reconnectAttempts = 0;
        status.lastHeartbeat = Date.now();
        status.error = undefined;
      });

      socket.on('disconnect', (reason) => {
        console.log(`❌ Disconnected from ${connectionName}: ${reason}`);
        status.isConnected = false;
        status.isConnecting = false;
        
        if (config.autoReconnect && status.reconnectAttempts < config.maxReconnectAttempts) {
          this.scheduleReconnect(connectionName);
        }
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ Connection error for ${connectionName}:`, error);
        clearTimeout(connectionTimeout);
        status.error = error.message;
        status.isConnecting = false;
        
        // Log error with context
        logError(error, {
          service: 'websocket',
          operation: `connect-${connectionName}`,
        }, 'medium');
        
        if (config.autoReconnect && status.reconnectAttempts < config.maxReconnectAttempts) {
          this.scheduleReconnect(connectionName);
        }
      });

      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${connectionName}:`, error);
        status.error = error.message;
      });

      // Handle heartbeat
      socket.on('pong', () => {
        status.lastHeartbeat = Date.now();
      });

      this.connections.set(connectionName, socket);
      
      // Connect the socket
      socket.connect();
      
    } catch (error) {
      console.error(`❌ Failed to create connection for ${connectionName}:`, error);
      status.isConnecting = false;
      status.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private scheduleReconnect(connectionName: string): void {
    const config = this.connectionConfigs.get(connectionName);
    const status = this.connectionStatus.get(connectionName);
    
    if (!config || !status) return;

    status.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, status.reconnectAttempts - 1), 30000);
    
    console.log(`🔄 Scheduling reconnect for ${connectionName} in ${delay}ms (attempt ${status.reconnectAttempts}/${config.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (status.reconnectAttempts < config.maxReconnectAttempts) {
        this.connect(connectionName);
      }
    }, delay);
  }

  disconnect(connectionName: string): void {
    const socket = this.connections.get(connectionName);
    if (socket) {
      socket.disconnect();
      this.connections.delete(connectionName);
    }
    
    const status = this.connectionStatus.get(connectionName);
    if (status) {
      status.isConnected = false;
      status.isConnecting = false;
    }
  }

  disconnectAll(): void {
    for (const [name] of this.connections) {
      this.disconnect(name);
    }
  }

  emit(connectionName: string, event: string, data: any): void {
    const socket = this.connections.get(connectionName);
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`⚠️ Cannot emit to ${connectionName}: not connected`);
    }
  }

  on(connectionName: string, event: string, callback: (...args: any[]) => void): void {
    const socket = this.connections.get(connectionName);
    if (socket) {
      socket.on(event, callback);
      
      // Store listener for cleanup
      const listeners = this.eventListeners.get(connectionName);
      if (listeners) {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(callback);
      }
    }
  }

  off(connectionName: string, event: string, callback?: (...args: any[]) => void): void {
    const socket = this.connections.get(connectionName);
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }

  getConnectionStatus(connectionName: string): ConnectionStatus | undefined {
    return this.connectionStatus.get(connectionName);
  }

  getAllConnectionStatus(): ConnectionStatus[] {
    return Array.from(this.connectionStatus.values());
  }

  isConnected(connectionName: string): boolean {
    const status = this.connectionStatus.get(connectionName);
    return status?.isConnected || false;
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [name, status] of this.connectionStatus) {
        if (status.isConnected && status.lastHeartbeat > 0) {
          const timeSinceHeartbeat = now - status.lastHeartbeat;
          
          // If no heartbeat for 60 seconds, consider connection dead
          if (timeSinceHeartbeat > 60000) {
            console.warn(`⚠️ Connection ${name} appears dead, reconnecting...`);
            this.disconnect(name);
            this.connect(name);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.disconnectAll();
    this.connections.clear();
    this.connectionStatus.clear();
    this.connectionConfigs.clear();
    this.eventListeners.clear();
  }
}

export const connectionPool = new ConnectionPool();
export default connectionPool;
