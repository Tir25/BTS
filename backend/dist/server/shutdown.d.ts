import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
export declare function gracefulShutdown(io: SocketIOServer, server: HttpServer, signal: string): Promise<void>;
export declare function setupShutdownHandlers(io: SocketIOServer, server: HttpServer): void;
//# sourceMappingURL=shutdown.d.ts.map