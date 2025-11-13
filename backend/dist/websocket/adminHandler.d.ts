import { Server as SocketIOServer } from 'socket.io';
import { DriverAssignment } from './socketTypes';
export declare function broadcastAssignmentUpdate(io: SocketIOServer, driverId: string, assignment: DriverAssignment): void;
export declare function broadcastAssignmentRemoval(io: SocketIOServer, driverId: string, busId: string): void;
export declare function attachAdminBroadcastFunctions(io: SocketIOServer): void;
//# sourceMappingURL=adminHandler.d.ts.map