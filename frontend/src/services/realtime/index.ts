// Real-time Architecture Services
export { connectionPool } from './ConnectionPool';
export type { ConnectionStatus, ConnectionConfig } from './ConnectionPool';
export { supabaseRealtimeService } from './SupabaseRealtimeService';
export type { RealtimeSubscription, RealtimeConfig } from './SupabaseRealtimeService';
export { sseService } from './SSEService';
export type { SSEEvent, SSEConfig, SSESubscription } from './SSEService';
export { realtimeManager } from './RealtimeManager';
export type { RealtimeEvent, RealtimeHealth } from './RealtimeManager';

// Default exports for convenience
export { default as ConnectionPool } from './ConnectionPool';
export { default as SupabaseRealtimeService } from './SupabaseRealtimeService';
export { default as SSEService } from './SSEService';
export { default as RealtimeManager } from './RealtimeManager';
