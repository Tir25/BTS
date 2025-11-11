export declare function getAdminEmails(): string[];
type AttemptRecord = {
    count: number;
    resetTime: number;
};
declare global {
    var authAttemptStore: Map<string, AttemptRecord> | undefined;
}
export declare function getAuthAttemptStore(): Map<string, AttemptRecord>;
export declare function checkAndIncrementRateLimit(key: string, maxAttempts: number, windowMs: number, now: number): {
    limited: boolean;
    record: {
        count: number;
        resetTime: number;
    };
};
export {};
//# sourceMappingURL=authUtils.d.ts.map