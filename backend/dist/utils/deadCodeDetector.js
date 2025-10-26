"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deadCodeDetector = exports.getDeadCodeReport = exports.detectDeadCode = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
class DeadCodeDetector {
    constructor(sourceDirectory = 'src') {
        this.sourceDirectory = sourceDirectory;
        this.excludePatterns = [
            'node_modules',
            '.git',
            'dist',
            'build',
            'coverage',
            '*.test.ts',
            '*.spec.ts',
            '*.d.ts'
        ];
        this.fileExtensions = ['.ts', '.js', '.tsx', '.jsx'];
    }
    async detectDeadCode() {
        logger_1.logger.info('Starting dead code detection', 'dead-code-detector');
        const report = {
            unusedFiles: [],
            unusedExports: [],
            unusedImports: [],
            unusedFunctions: [],
            unusedVariables: [],
            deprecatedCode: []
        };
        try {
            const sourceFiles = this.getAllSourceFiles();
            for (const file of sourceFiles) {
                await this.analyzeFile(file, report);
            }
            await this.crossReferenceAnalysis(report);
            logger_1.logger.info('Dead code detection completed', 'dead-code-detector', {
                unusedFiles: report.unusedFiles.length,
                unusedExports: report.unusedExports.length,
                unusedImports: report.unusedImports.length,
                unusedFunctions: report.unusedFunctions.length,
                unusedVariables: report.unusedVariables.length,
                deprecatedCode: report.deprecatedCode.length
            });
            return report;
        }
        catch (error) {
            logger_1.logger.error('Error during dead code detection', 'dead-code-detector', { error });
            throw error;
        }
    }
    getAllSourceFiles() {
        const files = [];
        const scanDirectory = (dir) => {
            const items = fs_1.default.readdirSync(dir);
            for (const item of items) {
                const fullPath = path_1.default.join(dir, item);
                const stat = fs_1.default.statSync(fullPath);
                if (stat.isDirectory()) {
                    if (!this.excludePatterns.some(pattern => pattern.includes('*') ? this.matchesPattern(item, pattern) : item === pattern)) {
                        scanDirectory(fullPath);
                    }
                }
                else if (stat.isFile()) {
                    const ext = path_1.default.extname(item);
                    if (this.fileExtensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        };
        scanDirectory(this.sourceDirectory);
        return files;
    }
    matchesPattern(filename, pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
    }
    async analyzeFile(filePath, report) {
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            this.analyzeImports(filePath, lines, report);
            this.analyzeExports(filePath, lines, report);
            this.analyzeFunctions(filePath, lines, report);
            this.analyzeVariables(filePath, lines, report);
            this.checkDeprecatedCode(filePath, lines, report);
        }
        catch (error) {
            logger_1.logger.error('Error analyzing file', 'dead-code-detector', { error, file: filePath });
        }
    }
    analyzeImports(filePath, lines, report) {
        const importRegex = /^import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/;
        const content = lines.join('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(importRegex);
            if (match) {
                const importPath = match[1];
                const isUsed = this.isImportUsed(content, importPath);
                if (!isUsed) {
                    report.unusedImports.push({
                        file: filePath,
                        import: importPath,
                        line: i + 1
                    });
                }
            }
        }
    }
    analyzeExports(filePath, lines, report) {
        const exportRegex = /^export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(exportRegex);
            if (match) {
                const exportName = match[1];
                const isUsed = this.isExportUsed(exportName, filePath);
                if (!isUsed) {
                    report.unusedExports.push({
                        file: filePath,
                        export: exportName,
                        line: i + 1
                    });
                }
            }
        }
    }
    analyzeFunctions(filePath, lines, report) {
        const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?(?:async\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(functionRegex);
            if (match) {
                const functionName = match[1] || match[2];
                const isUsed = this.isFunctionUsed(functionName, filePath);
                if (!isUsed) {
                    report.unusedFunctions.push({
                        file: filePath,
                        function: functionName,
                        line: i + 1
                    });
                }
            }
        }
    }
    analyzeVariables(filePath, lines, report) {
        const variableRegex = /^(?:export\s+)?(?:const|let|var)\s+(\w+)/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const match = line.match(variableRegex);
            if (match) {
                const variableName = match[1];
                const isUsed = this.isVariableUsed(variableName, filePath);
                if (!isUsed) {
                    report.unusedVariables.push({
                        file: filePath,
                        variable: variableName,
                        line: i + 1
                    });
                }
            }
        }
    }
    checkDeprecatedCode(filePath, lines, report) {
        const deprecatedPatterns = [
            { pattern: /@deprecated/, reason: 'Deprecated annotation found' },
            { pattern: /TODO.*remove/, reason: 'TODO comment for removal' },
            { pattern: /FIXME.*remove/, reason: 'FIXME comment for removal' },
            { pattern: /console\.log/, reason: 'Console.log statement (should use logger)' },
            { pattern: /console\.error/, reason: 'Console.error statement (should use logger)' },
            { pattern: /console\.warn/, reason: 'Console.warn statement (should use logger)' }
        ];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const { pattern, reason } of deprecatedPatterns) {
                if (pattern.test(line)) {
                    report.deprecatedCode.push({
                        file: filePath,
                        code: line.trim(),
                        line: i + 1,
                        reason
                    });
                }
            }
        }
    }
    isImportUsed(content, importPath) {
        return content.includes(importPath);
    }
    isExportUsed(exportName, filePath) {
        const sourceFiles = this.getAllSourceFiles();
        for (const file of sourceFiles) {
            if (file !== filePath) {
                const content = fs_1.default.readFileSync(file, 'utf8');
                if (content.includes(exportName)) {
                    return true;
                }
            }
        }
        return false;
    }
    isFunctionUsed(functionName, filePath) {
        const sourceFiles = this.getAllSourceFiles();
        for (const file of sourceFiles) {
            if (file !== filePath) {
                const content = fs_1.default.readFileSync(file, 'utf8');
                if (content.includes(functionName)) {
                    return true;
                }
            }
        }
        return false;
    }
    isVariableUsed(variableName, filePath) {
        const sourceFiles = this.getAllSourceFiles();
        for (const file of sourceFiles) {
            if (file !== filePath) {
                const content = fs_1.default.readFileSync(file, 'utf8');
                if (content.includes(variableName)) {
                    return true;
                }
            }
        }
        return false;
    }
    async crossReferenceAnalysis(report) {
        logger_1.logger.debug('Performing cross-reference analysis', 'dead-code-detector');
    }
    generateCleanupReport(report) {
        let cleanupReport = '# Dead Code Cleanup Report\n\n';
        if (report.unusedFiles.length > 0) {
            cleanupReport += '## Unused Files\n';
            report.unusedFiles.forEach(file => {
                cleanupReport += `- ${file}\n`;
            });
            cleanupReport += '\n';
        }
        if (report.unusedExports.length > 0) {
            cleanupReport += '## Unused Exports\n';
            report.unusedExports.forEach(exp => {
                cleanupReport += `- ${exp.file}:${exp.line} - ${exp.export}\n`;
            });
            cleanupReport += '\n';
        }
        if (report.unusedImports.length > 0) {
            cleanupReport += '## Unused Imports\n';
            report.unusedImports.forEach(imp => {
                cleanupReport += `- ${imp.file}:${imp.line} - ${imp.import}\n`;
            });
            cleanupReport += '\n';
        }
        if (report.unusedFunctions.length > 0) {
            cleanupReport += '## Unused Functions\n';
            report.unusedFunctions.forEach(func => {
                cleanupReport += `- ${func.file}:${func.line} - ${func.function}\n`;
            });
            cleanupReport += '\n';
        }
        if (report.unusedVariables.length > 0) {
            cleanupReport += '## Unused Variables\n';
            report.unusedVariables.forEach(variable => {
                cleanupReport += `- ${variable.file}:${variable.line} - ${variable.variable}\n`;
            });
            cleanupReport += '\n';
        }
        if (report.deprecatedCode.length > 0) {
            cleanupReport += '## Deprecated Code\n';
            report.deprecatedCode.forEach(dep => {
                cleanupReport += `- ${dep.file}:${dep.line} - ${dep.reason}\n`;
                cleanupReport += `  Code: ${dep.code}\n`;
            });
            cleanupReport += '\n';
        }
        return cleanupReport;
    }
}
const deadCodeDetector = new DeadCodeDetector();
exports.deadCodeDetector = deadCodeDetector;
const detectDeadCode = async (req, res) => {
    try {
        const report = await deadCodeDetector.detectDeadCode();
        res.json({
            success: true,
            data: report,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error detecting dead code', 'dead-code-detector', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to detect dead code'
        });
    }
};
exports.detectDeadCode = detectDeadCode;
const getDeadCodeReport = async (req, res) => {
    try {
        const report = await deadCodeDetector.detectDeadCode();
        const cleanupReport = deadCodeDetector.generateCleanupReport(report);
        res.json({
            success: true,
            data: {
                report,
                cleanupReport
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating dead code report', 'dead-code-detector', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to generate dead code report'
        });
    }
};
exports.getDeadCodeReport = getDeadCodeReport;
//# sourceMappingURL=deadCodeDetector.js.map