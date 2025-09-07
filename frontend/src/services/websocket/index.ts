// Optimized WebSocket Services

export { optimizedWebSocketService } from './OptimizedWebSocketService';
export { webSocketOptimizer } from './WebSocketOptimizer';
export { reconnectionStrategy } from './ReconnectionStrategy';

// Re-export types
export type { OptimizedMessage } from './WebSocketOptimizer';
export type { ReconnectionConfig, ReconnectionState, ReconnectionEvent, ReconnectionEventHandler } from './ReconnectionStrategy';
export type { ConnectionPoolConfig, ConnectionMetrics } from './WebSocketOptimizer';
export type { OptimizedWebSocketConfig } from './OptimizedWebSocketService';

