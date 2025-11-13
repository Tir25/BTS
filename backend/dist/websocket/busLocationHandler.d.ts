import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './socketTypes';
export declare function setupBusLocationHandler(io: SocketIOServer, socket: AuthenticatedSocket): void;
export declare function cleanupLocationRateLimiter(socketId: string): void;
//# sourceMappingURL=busLocationHandler.d.ts.map