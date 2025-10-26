export declare const cacheMiddleware: () => (req: any, res: any, next: any) => void;
export declare const invalidateCache: () => (req: any, res: any, next: any) => void;
export declare const cacheStats: (req: any, res: any) => void;
export declare const clearCache: (req: any, res: any) => void;
export declare const cache: {
    size: () => number;
    clear: () => void;
};
//# sourceMappingURL=cache.d.ts.map