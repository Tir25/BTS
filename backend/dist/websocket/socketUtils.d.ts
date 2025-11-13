import { Server as SocketIOServer } from 'socket.io';
import { BusLocationData, AuthenticatedSocket } from './socketTypes';
export declare function broadcastLocationUpdate(io: SocketIOServer, locationData: BusLocationData): void;
export declare function broadcastBusArriving(io: SocketIOServer, data: {
    busId: string;
    routeId?: string;
    location: [number, number];
    timestamp: string;
}): void;
export declare function emitError(socket: AuthenticatedSocket, message: string, code: string): void;
export declare function getConnectedClientsStats(io: SocketIOServer): {
    total: number;
    students: number;
    drivers: number;
};
export declare function joinRelevantRooms(socket: AuthenticatedSocket, driverId?: string, busId?: string): void;
export declare function cleanupSocket(socket: AuthenticatedSocket, connectionStats: {
    activeSockets: Map<string, AuthenticatedSocket>;
    connectionTimestamps: Map<string, number>;
    heartbeatIntervals: Map<string, NodeJS.Timeout>;
}): void;
//# sourceMappingURL=socketUtils.d.ts.map