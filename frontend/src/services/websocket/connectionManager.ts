import { io, Socket } from 'socket.io-client';
import { environment } from '../../config/environment';
import { logger } from '../../utils/logger';
import { authService } from '../authService';
import { studentAuthService } from '../auth/studentAuthService';
import { timeoutConfig } from '../../config/timeoutConfig';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ConnectionStats {
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  lastHeartbeat: number;
  uptime: number;
  totalConnections: number;
  failedConnections: number;
}

interface WebSocketConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  mobileOptimizations: boolean;
}

/**
 * Connection manager for WebSocket
 * Handles connection lifecycle, reconnection, and heartbeat
 * PRODUCTION FIX: Single error logging point - no duplicate logs
 */
export class ConnectionManager {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private clientType: 'student' | 'driver' | 'admin' = 'student';
  private isShuttingDown: boolean = false;
  private reconnectAttempts: number = 0;
  private lastHeartbeat: number = 0;
  private connectionStartTime: number = 0;
  private totalConnections: number = 0;
  private failedConnections: number = 0;
  private connectionLock: Promise<void> | null = null;
  private lastError: Error | null = null; // Track last error to prevent duplicate logs
  
  private config: WebSocketConfig = {
    maxReconnectAttempts: 5,
    baseReconnectDelay: 1000,
    maxReconnectDelay: 10000,
    heartbeatInterval: timeoutConfig.websocket.heartbeat,
    connectionTimeout: timeoutConfig.websocket.connection,
    mobileOptimizations: true,
  };

  private timers: {
    heartbeat?: NodeJS.Timeout;
    connection?: NodeJS.Timeout;
    reconnect?: NodeJS.Timeout;
  } = {};

  private connectionStateListeners: Set<(state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void> = new Set();

  private isMobile: boolean = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  constructor() {
    if (this.isMobile) {
      this.config.heartbeatInterval = 60000;
      this.config.connectionTimeout = 20000;
      this.config.maxReconnectAttempts = 10;
    }
  }

  getClientType(): 'student' | 'driver' | 'admin' {
    return this.clientType;
  }

  setClientType(type: 'student' | 'driver' | 'admin'): void {
    this.clientType = type;
  }

  resetState(): void {
    this.reconnectAttempts = 0;
    this.isShuttingDown = false;
    this.lastHeartbeat = 0;
    this.lastError = null;
  }

  /**
   * Connect to WebSocket server
   * PRODUCTION FIX: No duplicate error logging - errors logged only in performConnection
   */
  async connect(): Promise<void> {
    // If already connected with correct client type, return
    if (this.connectionState === 'connected' && this.socket?.connected) {
      const currentClientType = (this.socket as any).clientType || this.clientType;
      if (currentClientType === this.clientType) {
        logger.debug('WebSocket already connected', 'component', { clientType: this.clientType });
        return;
      }
      // Client type mismatch - disconnect and reconnect
      this.disconnect();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Prevent concurrent connections
    if (this.connectionLock) {
      logger.debug('WebSocket connection in progress, waiting...', 'component', { 
        clientType: this.clientType,
        currentState: this.connectionState
      });
      try {
        await this.connectionLock;
        if (this.connectionState === 'connected' && this.socket?.connected) {
          const currentClientType = (this.socket as any).clientType || this.clientType;
          if (currentClientType === this.clientType) {
            return;
          }
          this.disconnect();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        // Previous connection failed, continue with new connection
        logger.debug('Previous connection attempt failed, starting new connection', 'component');
      }
    }

    // Create connection lock
    this.connectionLock = this.performConnection();
    
    try {
      await this.connectionLock;
      this.resetReconnectAttempts();
      this.lastError = null; // Clear error on success
    } finally {
      this.connectionLock = null;
    }
  }

  /**
   * Internal connection method - SINGLE POINT OF ERROR LOGGING
   * PRODUCTION FIX: Enhanced diagnostics and error handling
   */
  private async performConnection(): Promise<void> {
    try {
      this.updateConnectionState('connecting');
      this.connectionStartTime = Date.now();
      this.totalConnections++;
      
      const wsUrl = environment.api.websocketUrl;
      const authToken = await this.getValidAuthToken();
      
      // PRODUCTION FIX: Enhanced logging with diagnostics
      // Log to console for visibility
      console.log('🔌 Connecting to WebSocket server...', {
        url: wsUrl,
        clientType: this.clientType,
        hasToken: !!authToken,
        tokenLength: authToken?.length || 0,
        isMobile: this.isMobile,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        origin: window.location.origin,
        userAgent: navigator.userAgent.substring(0, 100),
      });
      
      logger.info('🔌 Connecting to WebSocket server...', 'component', {
        url: wsUrl,
        clientType: this.clientType,
        hasToken: !!authToken,
        tokenLength: authToken?.length || 0,
        isMobile: this.isMobile,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        origin: window.location.origin,
        userAgent: navigator.userAgent.substring(0, 100),
      });
      
      // PRODUCTION FIX: Check if backend is reachable before attempting connection
      if (this.clientType === 'driver' && !authToken) {
        const errorMsg = 'No authentication token available for driver connection';
        logger.error('❌ WebSocket connection failed', 'component', {
          error: errorMsg,
          clientType: this.clientType,
          url: wsUrl,
          suggestion: 'Please ensure you are logged in and your session is valid',
        });
        throw new Error(errorMsg);
      }

      // PRODUCTION FIX: Check backend health before attempting WebSocket connection
      // This helps diagnose if the backend is running
      try {
        const apiUrl = environment.api.baseUrl;
        const healthUrl = `${apiUrl}/health`;
        logger.debug('Checking backend health before WebSocket connection...', 'component', {
          healthUrl,
          clientType: this.clientType,
        });
        
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        
        if (!healthResponse.ok) {
          logger.warn('Backend health check returned non-OK status', 'component', {
            status: healthResponse.status,
            statusText: healthResponse.statusText,
            clientType: this.clientType,
          });
        } else {
          logger.debug('Backend health check passed', 'component', {
            status: healthResponse.status,
            clientType: this.clientType,
          });
        }
      } catch (healthError) {
        // Backend health check failed - log warning but continue with connection attempt
        // This might be a network issue or backend not running
        const healthErrorMsg = healthError instanceof Error ? healthError.message : String(healthError);
        logger.warn('Backend health check failed, but continuing with connection attempt', 'component', {
          error: healthErrorMsg,
          clientType: this.clientType,
          url: wsUrl,
          suggestion: 'Backend might not be running. Connection attempt will proceed but may fail.',
        });
      }

      this.socket = this.createSocket(authToken);
      this.socket.connect();
      
      await this.connectWithTimeout();
      
      // Update state to connected
      this.updateConnectionState('connected');
      this.lastError = null;
      
      logger.info('✅ WebSocket connected successfully', 'component', {
        url: wsUrl,
        clientType: this.clientType,
        socketId: this.socket.id
      });
      
    } catch (error) {
      const wsUrl = environment.api.websocketUrl;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
        // PRODUCTION FIX: Enhanced error handling with detailed diagnostics
        const errorObj = error instanceof Error ? error : { message: errorMessage };
        const errorCode = (errorObj as any).code || '';
        const isAuthError = (errorObj as any).isAuthError || false;
        const isNetworkError = (errorObj as any).isNetworkError || false;
        const originalError = (errorObj as any).originalError || errorMessage;
        
        // Check if this is a duplicate error
        const isDuplicateError = this.lastError?.message === errorMessage;
        
        if (!isDuplicateError) {
          // Detect server down scenarios
          const isServerDown = 
            !isAuthError && (
              errorName === 'TypeError' ||
              errorMessage.toLowerCase().includes('failed to fetch') ||
              errorMessage.toLowerCase().includes('networkerror') ||
              errorMessage.toLowerCase().includes('network request failed') ||
              errorMessage.toLowerCase().includes('connection refused') ||
              errorMessage.toLowerCase().includes('connection interrupted') ||
              errorMessage.toLowerCase().includes('socket hang up') ||
              errorMessage.toLowerCase().includes('econnrefused')
            );
          
          // Create enhanced error message based on error type
          let enhancedErrorMessage = errorMessage;
          if (isAuthError) {
            enhancedErrorMessage = `Authentication failed: ${originalError || errorMessage}. Please ensure you are logged in and your session is valid.`;
          } else if (isServerDown) {
            enhancedErrorMessage = `WebSocket server is not running or not accessible at ${wsUrl}. Please ensure the backend server is running and try again.`;
          }
          
          // SINGLE POINT OF ERROR LOGGING with detailed diagnostics
          // PRODUCTION FIX: Log full error details including stack trace and all properties
          const errorDetails: any = { 
            error: enhancedErrorMessage,
            originalError: errorMessage,
            errorName,
            errorCode,
            url: wsUrl,
            clientType: this.clientType,
            isMobile: this.isMobile,
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            origin: window.location.origin,
            isServerDown,
            isAuthError,
            isNetworkError,
            suggestion: isServerDown 
              ? 'Please check if the backend server is running on ' + wsUrl.replace(/^ws[s]?:\/\//, '').split('/')[0]
              : isAuthError
                ? 'Please ensure you are logged in and your session is valid. Try logging out and logging in again.'
                : undefined,
          };
          
          // Add stack trace if available
          if (error instanceof Error) {
            errorDetails.stack = error.stack;
            // Add all error properties
            Object.keys(error).forEach(key => {
              if (!['message', 'name', 'stack'].includes(key)) {
                errorDetails[key] = (error as any)[key];
              }
            });
          }
          
          // PRODUCTION FIX: Also log to console.error for visibility
          console.error('❌ WebSocket connection failed:', {
            message: enhancedErrorMessage,
            originalError: errorMessage,
            errorCode,
            errorName,
            isAuthError,
            isNetworkError,
            isServerDown,
            url: wsUrl,
            clientType: this.clientType,
            error: error instanceof Error ? error : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          
          logger.error('❌ WebSocket connection failed', 'component', errorDetails);
          
          this.lastError = error instanceof Error ? error : new Error(errorMessage);
          this.updateConnectionState('error', enhancedErrorMessage);
          this.failedConnections++;
          
          const enhancedError: any = error instanceof Error ? error : new Error(enhancedErrorMessage);
          enhancedError.code = errorCode || (isServerDown ? 'SERVER_NOT_RUNNING' : isAuthError ? 'AUTH_ERROR' : 'CONNECTION_ERROR');
          enhancedError.isNetworkError = isNetworkError || isServerDown;
          enhancedError.isAuthError = isAuthError;
          enhancedError.originalError = originalError;
          throw enhancedError;
        } else {
          // Duplicate error - just rethrow without logging
          throw error;
        }
    }
  }

  private async getValidAuthToken(): Promise<string | null> {
    let token: string | null = null;
    
    try {
      if (this.clientType === 'student') {
        token = studentAuthService.getAccessToken();
        if (token) {
          logger.debug('Using student authentication token', 'component');
          return token;
        }
        logger.debug('Student connecting without authentication (anonymous mode)', 'component');
        return null;
      } else {
        token = authService.getAccessToken();
        if (!token && this.clientType === 'driver') {
          try {
            logger.debug('Attempting to refresh driver session...', 'component');
            const refreshResult = await authService.refreshSession();
            if (refreshResult.success && refreshResult.session) {
              token = refreshResult.session.access_token;
              logger.debug('Driver session refreshed successfully', 'component');
              return token;
            }
          } catch (refreshError) {
            logger.debug('Failed to refresh driver session', 'component', {
              error: refreshError instanceof Error ? refreshError.message : String(refreshError)
            });
          }
        }
        return token;
      }
    } catch (error) {
      logger.debug('Error getting authentication token', 'component', {
        error: error instanceof Error ? error.message : String(error),
        clientType: this.clientType
      });
      return null;
    }
  }

  private createSocket(authToken: string | null): Socket {
    const wsUrl = environment.api.websocketUrl;
    
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: this.config.connectionTimeout,
      forceNew: true,
      reconnection: false,
      autoConnect: false,
      auth: {
        token: authToken || (this.clientType === 'student' ? null : ''),
        clientType: this.clientType,
      },
      query: {
        clientType: this.clientType,
        version: '3.0.0',
        timestamp: Date.now().toString(),
      },
      ...(this.isMobile && {
        pingTimeout: 60000,
        pingInterval: 25000,
      }),
    });
    
    (socket as any).clientType = this.clientType;
    return socket;
  }

  private async connectWithTimeout(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // PRODUCTION FIX: Define wsUrl at the beginning of the method scope
      // so it's accessible throughout the Promise callback
      const wsUrl = environment.api.websocketUrl;
      const connectionStartTime = Date.now();
      
      // PRODUCTION FIX: Enhanced timeout error with better diagnostics
      this.timers.connection = setTimeout(() => {
        const elapsedTime = Date.now() - connectionStartTime;
        const timeoutError: any = new Error(`Connection timeout after ${elapsedTime}ms. The WebSocket server at ${wsUrl} did not respond within ${this.config.connectionTimeout}ms. Please ensure the backend server is running.`);
        timeoutError.code = 'CONNECTION_TIMEOUT';
        timeoutError.isNetworkError = true;
        timeoutError.isServerDown = true;
        timeoutError.url = wsUrl;
        timeoutError.timeoutMs = this.config.connectionTimeout;
        timeoutError.elapsedMs = elapsedTime;
        timeoutError.suggestion = `Check if the backend server is running at ${wsUrl.replace(/^ws[s]?:\/\//, '').split('/')[0]}. If the server is running, try increasing the connection timeout or check your network connection.`;
        reject(timeoutError);
      }, this.config.connectionTimeout);

      const cleanup = () => {
        if (this.timers.connection) {
          clearTimeout(this.timers.connection);
          this.timers.connection = undefined;
        }
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        this.socket?.off('disconnect', onDisconnect);
      };

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error | unknown) => {
        cleanup();
        
        // PRODUCTION FIX: Enhanced error extraction - Socket.IO passes errors in different formats
        // First, log the raw error to see what we're actually getting
        console.error('🔴 RAW WebSocket connect_error event:', error);
        console.error('🔴 Error type:', typeof error);
        console.error('🔴 Error is Error instance:', error instanceof Error);
        if (error && typeof error === 'object') {
          console.error('🔴 Error keys:', Object.keys(error));
          console.error('🔴 Error properties:', Object.getOwnPropertyNames(error));
          console.error('🔴 Error JSON:', JSON.stringify(error, null, 2));
        }
        
        let errorMessage = 'Unknown connection error';
        let errorCode = '';
        let originalError = '';
        let errorData: any = null;
        
        // Extract error details from different error formats
        if (error instanceof Error) {
          errorMessage = error.message;
          errorCode = (error as any).code || '';
          originalError = (error as any).originalError || errorMessage;
          errorData = error;
          console.error('🔴 Extracted from Error:', { errorMessage, errorCode, originalError, message: error.message, name: error.name, stack: error.stack });
        } else if (error && typeof error === 'object') {
          // Socket.IO sometimes passes error as an object
          errorMessage = (error as any).message || (error as any).data?.message || (error as any).description || String(error);
          errorCode = (error as any).code || (error as any).data?.code || (error as any).type || '';
          originalError = (error as any).originalError || (error as any).data?.originalError || (error as any).description || errorMessage;
          errorData = error;
          console.error('🔴 Extracted from object:', { errorMessage, errorCode, originalError, fullError: error });
        } else {
          errorMessage = String(error || 'Unknown error');
          errorData = { message: errorMessage };
          console.error('🔴 Extracted from string/other:', { errorMessage });
        }
        
        // PRODUCTION FIX: Try to extract error code from error message if not in error object
        if (!errorCode) {
          if (errorMessage.includes('Authentication token required')) {
            errorCode = 'AUTH_TOKEN_REQUIRED';
          } else if (errorMessage.includes('Invalid authentication token') || errorMessage.includes('Invalid token')) {
            errorCode = 'AUTH_TOKEN_INVALID';
          } else if (errorMessage.includes('Authentication failed') || errorMessage.includes('Authentication error')) {
            errorCode = 'AUTH_FAILED';
          }
        }
        
        // PRODUCTION FIX: wsUrl is now defined at the method scope, no need to redefine here
        // Check for authentication errors first
        const isAuthError = 
          errorCode === 'AUTH_TOKEN_REQUIRED' ||
          errorCode === 'AUTH_TOKEN_INVALID' ||
          errorCode === 'AUTH_FAILED' ||
          errorMessage.toLowerCase().includes('authentication') ||
          errorMessage.toLowerCase().includes('token required') ||
          errorMessage.toLowerCase().includes('invalid token') ||
          errorMessage.toLowerCase().includes('token') && errorMessage.toLowerCase().includes('required');
        
        // Check for network errors
        const isNetworkError = 
          !isAuthError && (
            errorCode === 'NETWORK_ERROR' ||
            errorMessage.toLowerCase().includes('failed to fetch') ||
            errorMessage.toLowerCase().includes('networkerror') ||
            errorMessage.toLowerCase().includes('network request failed') ||
            errorMessage.toLowerCase().includes('connection refused') ||
            errorMessage.toLowerCase().includes('connection interrupted') ||
            errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('socket hang up') ||
            errorMessage.toLowerCase().includes('econnrefused') ||
            errorMessage.toLowerCase().includes('xhr poll error') ||
            errorMessage.toLowerCase().includes('transport error')
          );
        
        // Create enhanced error message
        let enhancedErrorMessage = errorMessage;
        if (isAuthError) {
          enhancedErrorMessage = `Authentication failed: ${originalError || errorMessage}. Please ensure you are logged in and your session is valid.`;
        } else if (isNetworkError) {
          enhancedErrorMessage = `WebSocket server is not accessible at ${wsUrl}. Please ensure the backend server is running on ${wsUrl.replace(/^ws[s]?:\/\//, '').split('/')[0]}`;
        }
        
        // PRODUCTION FIX: Log full error details for diagnostics
        logger.debug('WebSocket connect_error event received', 'component', {
          errorMessage,
          errorCode,
          originalError,
          errorType: typeof error,
          errorKeys: errorData ? Object.keys(errorData) : [],
          isAuthError,
          isNetworkError,
          clientType: this.clientType,
          url: wsUrl,
        });
        
        const enhancedError: any = error instanceof Error ? error : new Error(enhancedErrorMessage);
        enhancedError.code = errorCode || (isNetworkError ? 'NETWORK_ERROR' : isAuthError ? 'AUTH_ERROR' : 'CONNECTION_ERROR');
        enhancedError.isNetworkError = isNetworkError;
        enhancedError.isAuthError = isAuthError;
        enhancedError.originalError = originalError;
        enhancedError.errorData = errorData; // Store original error data for debugging
        
        reject(enhancedError);
      };

      const onDisconnect = (reason: string) => {
        cleanup();
        reject(new Error(`Connection failed: ${reason}`));
      };

      // PRODUCTION FIX: Add error listener BEFORE connect to catch all errors
      this.socket?.once('connect', onConnect);
      this.socket?.once('connect_error', onError);
      this.socket?.once('disconnect', onDisconnect);
      
      // PRODUCTION FIX: Also listen for general error events
      this.socket?.once('error', (error: any) => {
        logger.debug('WebSocket general error event received', 'component', {
          error: error?.message || error,
          code: error?.code,
          clientType: this.clientType,
        });
        // This will be handled by connect_error, but log it for diagnostics
      });

      // PRODUCTION FIX: Log connection attempt details
      logger.debug('Attempting WebSocket connection...', 'component', {
        url: wsUrl,
        clientType: this.clientType,
        hasAuth: !!this.socket && !!(this.socket as any).auth?.token,
        authKeys: this.socket ? Object.keys((this.socket as any).auth || {}) : [],
      });

      this.socket?.connect();
    });
  }

  updateConnectionState(state: ConnectionState, error?: string): void {
    this.connectionState = state;
    
    this.connectionStateListeners.forEach(listener => {
      try {
        listener({
          isConnected: state === 'connected',
          isAuthenticated: false,
          connectionState: state,
          error
        });
      } catch (listenerError) {
        logger.debug('Error in connection state listener', 'component', { error: listenerError });
      }
    });
  }

  private cleanupTimers(): void {
    Object.values(this.timers).forEach(timer => {
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer as any);
      }
    });
    this.timers = {};
  }

  disconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.debug('Disconnecting from WebSocket server...', 'component');

    this.cleanupTimers();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionStateListeners.clear();
    this.updateConnectionState('disconnected');
    this.lastHeartbeat = 0;
    this.lastError = null;
  }

  startHeartbeat(): void {
    this.stopHeartbeat();

    this.timers.heartbeat = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.lastHeartbeat = Date.now();
      }
    }, this.config.heartbeatInterval);
  }

  stopHeartbeat(): void {
    if (this.timers.heartbeat) {
      clearInterval(this.timers.heartbeat);
      this.timers.heartbeat = undefined;
    }
  }

  attemptReconnection(onReconnect: () => Promise<void>): void {
    if (this.isShuttingDown) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.debug('Max reconnection attempts reached', 'component', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts
      });
      this.updateConnectionState('error', 'Max reconnection attempts reached');
      return;
    }

    this.updateConnectionState('reconnecting');
    this.reconnectAttempts++;

    const baseDelay = this.config.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = Math.min(baseDelay + jitter, this.config.maxReconnectDelay);

    logger.debug('Attempting reconnection', 'component', { 
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay: `${Math.round(delay)}ms`,
      clientType: this.clientType
    });

    if (this.timers.reconnect) {
      clearTimeout(this.timers.reconnect);
    }

    this.timers.reconnect = setTimeout(() => {
      if (!this.isShuttingDown) {
        onReconnect()
          .then(() => {
            logger.debug('Reconnection successful', 'component', {
              attempt: this.reconnectAttempts,
              clientType: this.clientType
            });
          })
          .catch(error => {
            logger.debug('Reconnection failed', 'component', { 
              error: error instanceof Error ? error.message : String(error),
              attempt: this.reconnectAttempts,
              maxAttempts: this.config.maxReconnectAttempts,
              clientType: this.clientType
            });
            
            this.updateConnectionState('error', error instanceof Error ? error.message : String(error));
            
            if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
              this.attemptReconnection(onReconnect);
            }
          });
      }
    }, delay);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getConnectionStatus(): boolean {
    return this.connectionState === 'connected' && this.socket?.connected === true;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConnectionStats(): ConnectionStats {
    return {
      isConnected: this.connectionState === 'connected',
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      totalConnections: this.totalConnections,
      failedConnections: this.failedConnections,
    };
  }

  onConnectionStateChange(listener: (state: { 
    isConnected: boolean; 
    isAuthenticated: boolean; 
    connectionState: ConnectionState;
    error?: string;
  }) => void): () => void {
    this.connectionStateListeners.add(listener);
    
    listener({
      isConnected: this.connectionState === 'connected',
      isAuthenticated: false,
      connectionState: this.connectionState,
    });
    
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  shouldAttemptReconnection(): boolean {
    return !this.isShuttingDown && this.reconnectAttempts < this.config.maxReconnectAttempts;
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

export const connectionManager = new ConnectionManager();
