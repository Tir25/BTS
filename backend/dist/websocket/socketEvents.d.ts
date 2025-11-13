export declare const SocketEvents: {
    readonly DRIVER_INITIALIZE: "driver:initialize";
    readonly DRIVER_INITIALIZED: "driver:initialized";
    readonly DRIVER_INITIALIZATION_FAILED: "driver:initialization_failed";
    readonly DRIVER_LOCATION_UPDATE: "driver:locationUpdate";
    readonly DRIVER_LOCATION_CONFIRMED: "driver:locationConfirmed";
    readonly DRIVER_LOCATION_RATE_LIMITED: "driver:locationRateLimited";
    readonly DRIVER_REQUEST_ASSIGNMENT_UPDATE: "driver:requestAssignmentUpdate";
    readonly DRIVER_ASSIGNMENT_UPDATE: "driver:assignmentUpdate";
    readonly DRIVER_CONNECTED: "driver:connected";
    readonly DRIVER_DISCONNECTED: "driver:disconnected";
    readonly STUDENT_CONNECT: "student:connect";
    readonly STUDENT_CONNECTED: "student:connected";
    readonly STUDENT_DISCONNECTED: "student:disconnected";
    readonly BUS_LOCATION_UPDATE: "bus:locationUpdate";
    readonly BUS_ARRIVING: "bus:arriving";
    readonly ADMIN_BROADCAST: "admin:broadcast";
    readonly ERROR: "error";
    readonly PING: "ping";
    readonly PONG: "pong";
    readonly CONNECTION: "connection";
    readonly DISCONNECT: "disconnect";
};
export declare const SocketRooms: {
    readonly STUDENTS: "students";
    readonly DRIVER: (driverId: string) => string;
    readonly BUS: (busId: string) => string;
};
export declare const SocketErrorCodes: {
    readonly SERVER_FULL: "SERVER_FULL";
    readonly IP_LIMIT_EXCEEDED: "IP_LIMIT_EXCEEDED";
    readonly NOT_AUTHENTICATED: "NOT_AUTHENTICATED";
    readonly INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS";
    readonly NO_BUS_ASSIGNED: "NO_BUS_ASSIGNED";
    readonly INIT_ERROR: "INIT_ERROR";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly SAVE_ERROR: "SAVE_ERROR";
    readonly PROCESSING_ERROR: "PROCESSING_ERROR";
    readonly CONNECTION_ERROR: "CONNECTION_ERROR";
    readonly RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED";
    readonly ASSIGNMENT_UPDATE_ERROR: "ASSIGNMENT_UPDATE_ERROR";
    readonly AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED";
};
//# sourceMappingURL=socketEvents.d.ts.map