import { Socket } from 'socket.io';
declare global {
    var authAttemptStore: Map<string, {
        count: number;
        resetTime: number;
    }> | undefined;
}
interface AuthenticatedSocket extends Socket {
    driverId?: string;
    busId?: string;
    userId?: string;
    userRole?: string;
    isAuthenticated?: boolean;
    lastActivity?: number;
}
export declare const websocketAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export declare const websocketDriverAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export declare const websocketStudentAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export declare const websocketAdminAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export {};
//# sourceMappingURL=websocketAuth.d.ts.map