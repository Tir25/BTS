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
    static validateFile(file: any, allowedTypes: string[], maxSize: number): FileValidationResult;
    private static generatePublicUrl;
    static convertToPublicUrl(filePathOrUrl: string): string;
    static uploadImage(file: any, folder: string, fileName?: string): Promise<UploadResult>;
    static uploadDocument(file: any, folder: string, fileName?: string): Promise<UploadResult>;
    static createSignedUrl(filePath: string, expiresIn?: number): Promise<SignedUrlResult>;
    static deleteFile(filePath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    static getFileInfo(filePath: string): Promise<{
        success: boolean;
        info?: any;
        error?: string;
    }>;
    static listFiles(folder: string): Promise<{
        success: boolean;
        data?: any[];
        error?: string;
    }>;
    static extractFilePathFromUrl(url: string): string | null;
}
export default StorageService;
//# sourceMappingURL=storageService.d.ts.map