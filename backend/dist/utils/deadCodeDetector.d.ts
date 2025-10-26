interface DeadCodeReport {
    unusedFiles: string[];
    unusedExports: Array<{
        file: string;
        export: string;
        line: number;
    }>;
    unusedImports: Array<{
        file: string;
        import: string;
        line: number;
    }>;
    unusedFunctions: Array<{
        file: string;
        function: string;
        line: number;
    }>;
    unusedVariables: Array<{
        file: string;
        variable: string;
        line: number;
    }>;
    deprecatedCode: Array<{
        file: string;
        code: string;
        line: number;
        reason: string;
    }>;
}
declare class DeadCodeDetector {
    private sourceDirectory;
    private excludePatterns;
    private fileExtensions;
    constructor(sourceDirectory?: string);
    detectDeadCode(): Promise<DeadCodeReport>;
    private getAllSourceFiles;
    private matchesPattern;
    private analyzeFile;
    private analyzeImports;
    private analyzeExports;
    private analyzeFunctions;
    private analyzeVariables;
    private checkDeprecatedCode;
    private isImportUsed;
    private isExportUsed;
    private isFunctionUsed;
    private isVariableUsed;
    private crossReferenceAnalysis;
    generateCleanupReport(report: DeadCodeReport): string;
}
declare const deadCodeDetector: DeadCodeDetector;
export declare const detectDeadCode: (req: any, res: any) => Promise<void>;
export declare const getDeadCodeReport: (req: any, res: any) => Promise<void>;
export { deadCodeDetector };
//# sourceMappingURL=deadCodeDetector.d.ts.map