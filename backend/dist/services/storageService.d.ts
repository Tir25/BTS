export interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
    fileName?: string;
    filePath?: string;
}
export interface FileValidationResult {
    isValid: boolean;
    error?: string;
}
export interface SignedUrlResult {
    success: boolean;
    url?: string;
    error?: string;
    expiresIn?: number;
}
export declare class StorageService {
    static validateFile(file: {
        mimetype: string;
        size: number;
    }, allowedTypes: string[], maxSize: number): FileValidationResult;
    private static generatePublicUrl;
    static convertToPublicUrl(filePathOrUrl: string): string;
    static uploadImage(file: {
        mimetype: string;
        size: number;
        originalname: string;
        buffer: Buffer;
    }, folder: string, fileName?: string): Promise<UploadResult>;
    static uploadDocument(file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }, folder: string, fileName?: string): Promise<UploadResult>;
    static createSignedUrl(filePath: string, expiresIn?: number): Promise<SignedUrlResult>;
    static deleteFile(filePath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    static getFileInfo(filePath: string): Promise<{
        success: boolean;
        info?: Array<{
            name: string;
            id: string;
            updated_at: string;
            created_at: string;
            last_accessed_at: string;
            metadata: Record<string, unknown>;
        }>;
        error?: string;
    }>;
    static listFiles(folder: string): Promise<{
        success: boolean;
        data?: Array<{
            name: string;
            id: string;
            updated_at: string;
            created_at: string;
            last_accessed_at: string;
            metadata: Record<string, unknown>;
        }>;
        error?: string;
    }>;
    static extractFilePathFromUrl(url: string): string | null;
}
export default StorageService;
//# sourceMappingURL=storageService.d.ts.map