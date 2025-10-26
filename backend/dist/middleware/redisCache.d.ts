import { Request, Response, NextFunction } from 'express';
export interface CacheMiddlewareOptions {
    ttl?: number;
    tags?: string[];
    skipCache?: (req: Request) => boolean;
    keyGenerator?: (req: Request) => string;
    compress?: boolean;
}
export declare const redisCacheMiddleware: (options?: CacheMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const redisCacheInvalidation: (pattern: string | string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const redisCacheStats: (req: Request, res: Response) => Promise<void>;
export declare const redisCacheClear: (req: Request, res: Response) => Promise<void>;
export declare const redisCacheHealth: (req: Request, res: Response) => Promise<void>;
export declare const cacheWarming: (warmupFunction: (req: Request) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const smartCacheMiddleware: (options?: {
    defaultTTL?: number;
    dataTypeTTL?: Record<string, number>;
    skipCache?: (req: Request) => boolean;
}) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=redisCache.d.ts.map