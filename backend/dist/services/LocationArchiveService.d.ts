declare class LocationArchiveService {
    private archiveInterval;
    private cleanupInterval;
    private isRunning;
    archiveOldLocations(): Promise<{
        archived: number;
        deleted: number;
    }>;
    cleanupOldLocations(retentionDays?: number): Promise<number>;
    startAutoArchive(intervalMinutes?: number): void;
    startAutoCleanup(intervalHours?: number): void;
    stopAutoArchive(): void;
    stopAutoCleanup(): void;
    stop(): void;
}
export declare const locationArchiveService: LocationArchiveService;
export default locationArchiveService;
//# sourceMappingURL=LocationArchiveService.d.ts.map