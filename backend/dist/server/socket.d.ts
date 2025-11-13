import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Application } from 'express';
export declare function createServerWithSocket(app: Application): {
    server: ReturnType<typeof createServer>;
    io: SocketIOServer;
};
export declare function initializeSocketServer(io: SocketIOServer): void;
//# sourceMappingURL=socket.d.ts.map