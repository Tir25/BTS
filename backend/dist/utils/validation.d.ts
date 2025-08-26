interface LocationData {
    driverId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
}
export declare const validateLocationData: (data: LocationData) => string | null;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => string | null;
export declare const validateBusNumber: (busNumber: string) => string | null;
export declare const validateRouteName: (routeName: string) => string | null;
export declare const validateRouteData: (routeData: Record<string, unknown>) => string | null;
export {};
//# sourceMappingURL=validation.d.ts.map