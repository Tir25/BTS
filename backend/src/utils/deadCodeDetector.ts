import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { logger } from './logger';

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

class DeadCodeDetector {
  private sourceDirectory: string;
  private excludePatterns: string[];
  private fileExtensions: string[];

  constructor(sourceDirectory: string = 'src') {
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

  public async detectDeadCode(): Promise<DeadCodeReport> {
    logger.info('Starting dead code detection', 'dead-code-detector');
    
    const report: DeadCodeReport = {
      unusedFiles: [],
      unusedExports: [],
      unusedImports: [],
      unusedFunctions: [],
      unusedVariables: [],
      deprecatedCode: []
    };

    try {
      // Get all source files
      const sourceFiles = this.getAllSourceFiles();
      
      // Analyze each file
      for (const file of sourceFiles) {
        await this.analyzeFile(file, report);
      }

      // Cross-reference analysis
      await this.crossReferenceAnalysis(report);

      logger.info('Dead code detection completed', 'dead-code-detector', {
        unusedFiles: report.unusedFiles.length,
        unusedExports: report.unusedExports.length,
        unusedImports: report.unusedImports.length,
        unusedFunctions: report.unusedFunctions.length,
        unusedVariables: report.unusedVariables.length,
        deprecatedCode: report.deprecatedCode.length
      });

      return report;
    } catch (error) {
      logger.error('Error during dead code detection', 'dead-code-detector', { error });
      throw error;
    }
  }

  private getAllSourceFiles(): string[] {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!this.excludePatterns.some(pattern => 
            pattern.includes('*') ? this.matchesPattern(item, pattern) : item === pattern
          )) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // Check if file has supported extension
          const ext = path.extname(item);
          if (this.fileExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDirectory(this.sourceDirectory);
    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filename);
  }

  private async analyzeFile(filePath: string, report: DeadCodeReport): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Analyze imports
      this.analyzeImports(filePath, lines, report);
      
      // Analyze exports
      this.analyzeExports(filePath, lines, report);
      
      // Analyze functions
      this.analyzeFunctions(filePath, lines, report);
      
      // Analyze variables
      this.analyzeVariables(filePath, lines, report);
      
      // Check for deprecated code
      this.checkDeprecatedCode(filePath, lines, report);
      
    } catch (error) {
      logger.error('Error analyzing file', 'dead-code-detector', { error, file: filePath });
    }
  }

  private analyzeImports(filePath: string, lines: string[], report: DeadCodeReport): void {
    const importRegex = /^import\s+(?:{[^}]*}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/;
    const content = lines.join('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(importRegex);
      
      if (match) {
        const importPath = match[1];
        
        // Check if import is used in the file
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

  private analyzeExports(filePath: string, lines: string[], report: DeadCodeReport): void {
    const exportRegex = /^export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(exportRegex);
      
      if (match) {
        const exportName = match[1];
        
        // Check if export is used elsewhere
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

  private analyzeFunctions(filePath: string, lines: string[], report: DeadCodeReport): void {
    const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?(?:async\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(functionRegex);
      
      if (match) {
        const functionName = match[1] || match[2];
        
        // Check if function is used
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

  private analyzeVariables(filePath: string, lines: string[], report: DeadCodeReport): void {
    const variableRegex = /^(?:export\s+)?(?:const|let|var)\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(variableRegex);
      
      if (match) {
        const variableName = match[1];
        
        // Check if variable is used
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

  private checkDeprecatedCode(filePath: string, lines: string[], report: DeadCodeReport): void {
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

  private isImportUsed(content: string, importPath: string): boolean {
    // Simple check - in a real implementation, you'd need more sophisticated analysis
    return content.includes(importPath);
  }

  private isExportUsed(exportName: string, filePath: string): boolean {
    // Check if export is imported elsewhere
    const sourceFiles = this.getAllSourceFiles();
    
    for (const file of sourceFiles) {
      if (file !== filePath) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(exportName)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isFunctionUsed(functionName: string, filePath: string): boolean {
    // Check if function is called elsewhere
    const sourceFiles = this.getAllSourceFiles();
    
    for (const file of sourceFiles) {
      if (file !== filePath) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(functionName)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isVariableUsed(variableName: string, filePath: string): boolean {
    // Check if variable is referenced elsewhere
    const sourceFiles = this.getAllSourceFiles();
    
    for (const file of sourceFiles) {
      if (file !== filePath) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(variableName)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private async crossReferenceAnalysis(report: DeadCodeReport): Promise<void> {
    // Additional analysis to cross-reference findings
    logger.debug('Performing cross-reference analysis', 'dead-code-detector');
  }

  public generateCleanupReport(report: DeadCodeReport): string {
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

// Create global dead code detector instance
const deadCodeDetector = new DeadCodeDetector();

// Dead code detection endpoints
export const detectDeadCode = async (req: any, res: any) => {
  try {
    const report = await deadCodeDetector.detectDeadCode();
    res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error detecting dead code', 'dead-code-detector', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to detect dead code'
    });
  }
};

export const getDeadCodeReport = async (req: any, res: any) => {
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
  } catch (error) {
    logger.error('Error generating dead code report', 'dead-code-detector', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate dead code report'
    });
  }
};

// Export dead code detector instance
export { deadCodeDetector };
