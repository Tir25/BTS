import { AuthenticatedSocket } from '../websocket/socketTypes';
export declare const websocketAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export declare const websocketDriverAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export declare const websocketStudentAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
export declare const websocketAdminAuthMiddleware: (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
//# sourceMappingURL=websocketAuth.d.ts.map