import { Request, Response, NextFunction } from 'express';
export declare const createAdvancedRateLimit: (options: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
    message?: any;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
}) => (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimits: {
    general: (req: Request, res: Response, next: NextFunction) => void;
    auth: (req: Request, res: Response, next: NextFunction) => void;
    assignments: (req: Request, res: Response, next: NextFunction) => void;
    locations: (req: Request, res: Response, next: NextFunction) => void;
    admin: (req: Request, res: Response, next: NextFunction) => void;
    upload: (req: Request, res: Response, next: NextFunction) => void;
    websocket: (req: Request, res: Response, next: NextFunction) => void;
    analytics: (req: Request, res: Response, next: NextFunction) => void;
    development: (req: Request, res: Response, next: NextFunction) => void;
};
export declare const createDynamicRateLimit: (baseLimit: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const userTierRateLimits: {
    free: (req: Request, res: Response, next: NextFunction) => void;
    premium: (req: Request, res: Response, next: NextFunction) => void;
    enterprise: (req: Request, res: Response, next: NextFunction) => void;
};
export declare const operationRateLimits: {
    busAssignment: (req: Request, res: Response, next: NextFunction) => void;
    routeCreation: (req: Request, res: Response, next: NextFunction) => void;
    driverRegistration: (req: Request, res: Response, next: NextFunction) => void;
    locationUpdate: (req: Request, res: Response, next: NextFunction) => void;
};
export declare const defaultRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const getRateLimitStats: () => {
    limits: {
        general: {
            windowMs: number;
            max: number;
        };
        auth: {
            windowMs: number;
            max: number;
        };
        assignments: {
            windowMs: number;
            max: number;
        };
        locations: {
            windowMs: number;
            max: number;
        };
        admin: {
            windowMs: number;
            max: number;
        };
        upload: {
            windowMs: number;
            max: number;
        };
    };
    userTiers: {
        free: {
            windowMs: number;
            max: number;
        };
        premium: {
            windowMs: number;
            max: number;
        };
        enterprise: {
            windowMs: number;
            max: number;
        };
    };
    note: string;
};
//# sourceMappingURL=advancedRateLimit.d.ts.map