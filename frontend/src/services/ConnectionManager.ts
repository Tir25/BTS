import { IWebSocketService, BusLocation } from './interfaces/IWebSocketService';
import { BusArrivingData } from '../types';

import { logger } from '../utils/logger';

export interface ConnectionStatus {
  isConnected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  error: string | null;
}

export interface DriverConnectionData {
  driverId: string;
  busId: string;
  timestamp: string;
}


export interface ConnectionCallbacks {
  onBusLocationUpdate?: (location: BusLocation) => void;
  onDriverConnected?: (data: DriverConnectionData) => void;
  onDriverDisconnected?: (data: DriverConnectionData) => void;
  onStudentConnected?: () => void;
  onBusArriving?: (data: BusArrivingData) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
}

export class ConnectionManager {
  private websocketService: IWebSocketService;
  private callbacks: ConnectionCallbacks = {};
  private status: ConnectionStatus = {
    isConnected: false,
    status: 'disconnected',
    error: null,
  };
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private statusInterval: NodeJS.Timeout | null = null;

  constructor(websocketService: IWebSocketService) {
    this.websocketService = websocketService;
  }

  // Set callbacks for different events
  setCallbacks(callbacks: ConnectionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Connect to WebSocket
  async connect(backendUrl?: string): Promise<void> {
    try {
      this.updateStatus({
        isConnected: false,
        status: 'connecting',
        error: null,
      });

      await this.websocketService.connect(backendUrl);

      // Set up event listeners
      this.setupEventListeners();

      // Start monitoring connection status
      this.startStatusMonitoring();

      this.updateStatus({
        isConnected: true,
        status: 'connected',
        error: null,
      });

      logger.info('✅ ConnectionManager: WebSocket connected successfully', 'component');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus({
        isConnected: false,
        status: 'disconnected',
        error: errorMessage,
      });

      logger.error('Error occurred', 'component', { error: '❌ ConnectionManager: WebSocket connection failed:', details: error });
      this.scheduleReconnection();
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.cleanup();
    this.websocketService.disconnect();
    this.updateStatus({
      isConnected: false,
      status: 'disconnected',
      error: null,
    });
    logger.info('🔌 ConnectionManager: WebSocket disconnected', 'component');
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.status };
  }

  // Check if connected
  isConnected(): boolean {
    return this.status.isConnected;
  }

  // Private methods
  private setupEventListeners(): void {
    if (this.callbacks.onBusLocationUpdate) {
      this.websocketService.onBusLocationUpdate(
        this.callbacks.onBusLocationUpdate
      );
    }

    if (this.callbacks.onDriverConnected) {
      this.websocketService.onDriverConnected(this.callbacks.onDriverConnected);
    }

    if (this.callbacks.onDriverDisconnected) {
      this.websocketService.onDriverDisconnected(
        this.callbacks.onDriverDisconnected
      );
    }

    if (this.callbacks.onStudentConnected) {
      this.websocketService.onStudentConnected(
        this.callbacks.onStudentConnected
      );
    }

    if (this.callbacks.onBusArriving) {
      this.websocketService.onBusArriving(this.callbacks.onBusArriving);
    }
  }

  private startStatusMonitoring(): void {
    // Check connection status every 10 seconds
    this.statusInterval = setInterval(() => {
      const isConnected = this.websocketService.getConnectionStatus();
      if (!isConnected && this.status.status === 'connected') {
        this.updateStatus({
          isConnected: false,
          status: 'disconnected',
          error: 'Connection lost',
        });
        this.scheduleReconnection();
      }
    }, 10000);
  }

  private scheduleReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.updateStatus({
      isConnected: false,
      status: 'reconnecting',
      error: 'Attempting to reconnect...',
    });

    this.reconnectTimeout = setTimeout(() => {
      logger.info('🔄 ConnectionManager: Attempting to reconnect...', 'component');
      this.connect().catch((error) => {
        logger.error('Error occurred', 'component', { error });
      });
    }, 5000);
  }

  private updateStatus(newStatus: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...newStatus };

    if (this.callbacks.onConnectionStatusChange) {
      this.callbacks.onConnectionStatusChange(this.status);
    }
  }

  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  // Public method to force reconnection
  async reconnect(): Promise<void> {
    logger.info('🔄 ConnectionManager: Manual reconnection requested', 'component');
    this.cleanup();
    await this.connect();
  }
}
