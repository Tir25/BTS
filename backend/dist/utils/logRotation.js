"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRotator = exports.forceLogRotation = exports.getLogRotationStats = exports.logRotationMiddleware = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib = __importStar(require("zlib"));
const logger_1 = require("./logger");
const defaultConfig = {
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    compress: true,
    rotateOnStart: true,
    datePattern: 'YYYY-MM-DD',
    logDirectory: path_1.default.join(process.cwd(), 'logs')
};
class LogRotator {
    constructor(config = {}) {
        this.rotationTimer = null;
        this.isRotating = false;
        this.config = { ...defaultConfig, ...config };
        this.ensureLogDirectory();
        this.setupRotation();
    }
    ensureLogDirectory() {
        if (!fs_1.default.existsSync(this.config.logDirectory)) {
            fs_1.default.mkdirSync(this.config.logDirectory, { recursive: true });
            logger_1.logger.info('Created log directory', 'log-rotator', {
                directory: this.config.logDirectory
            });
        }
    }
    setupRotation() {
        if (this.config.rotateOnStart) {
            this.rotateLogs();
        }
        this.rotationTimer = setInterval(() => {
            this.checkAndRotate();
        }, 60 * 60 * 1000);
        logger_1.logger.info('Log rotation setup completed', 'log-rotator', {
            maxSize: this.config.maxSize,
            maxFiles: this.config.maxFiles,
            compress: this.config.compress
        });
    }
    checkAndRotate() {
        if (this.isRotating) {
            return;
        }
        try {
            if (this.shouldRotate()) {
                this.rotateLogs();
            }
        }
        catch (error) {
            logger_1.logger.error('Error during log rotation check', 'log-rotator', { error });
        }
    }
    shouldRotate() {
        const logFiles = this.getLogFiles();
        for (const file of logFiles) {
            const stats = fs_1.default.statSync(file);
            if (stats.size > this.config.maxSize) {
                return true;
            }
        }
        return false;
    }
    getLogFiles() {
        const files = [];
        const logPatterns = [
            'app.log',
            'error.log',
            'access.log',
            'combined.log'
        ];
        for (const pattern of logPatterns) {
            const filePath = path_1.default.join(this.config.logDirectory, pattern);
            if (fs_1.default.existsSync(filePath)) {
                files.push(filePath);
            }
        }
        return files;
    }
    rotateLogs() {
        if (this.isRotating) {
            return;
        }
        this.isRotating = true;
        logger_1.logger.info('Starting log rotation', 'log-rotator');
        try {
            const logFiles = this.getLogFiles();
            for (const logFile of logFiles) {
                this.rotateFile(logFile);
            }
            this.cleanupOldLogs();
            logger_1.logger.info('Log rotation completed', 'log-rotator');
        }
        catch (error) {
            logger_1.logger.error('Error during log rotation', 'log-rotator', { error });
        }
        finally {
            this.isRotating = false;
        }
    }
    rotateFile(logFile) {
        const stats = fs_1.default.statSync(logFile);
        if (stats.size < this.config.maxSize) {
            return;
        }
        const timestamp = new Date().toISOString().split('T')[0];
        const rotatedFile = `${logFile}.${timestamp}`;
        fs_1.default.renameSync(logFile, rotatedFile);
        fs_1.default.writeFileSync(logFile, '');
        if (this.config.compress) {
            this.compressFile(rotatedFile);
        }
        logger_1.logger.info('Rotated log file', 'log-rotator', {
            original: logFile,
            rotated: rotatedFile,
            size: stats.size
        });
    }
    compressFile(filePath) {
        try {
            const gzip = zlib.createGzip();
            const input = fs_1.default.createReadStream(filePath);
            const output = fs_1.default.createWriteStream(`${filePath}.gz`);
            input.pipe(gzip).pipe(output);
            output.on('finish', () => {
                fs_1.default.unlinkSync(filePath);
                logger_1.logger.debug('Compressed log file', 'log-rotator', { file: filePath });
            });
        }
        catch (error) {
            logger_1.logger.error('Error compressing log file', 'log-rotator', { error, file: filePath });
        }
    }
    cleanupOldLogs() {
        const logFiles = this.getLogFiles();
        for (const logFile of logFiles) {
            this.cleanupFile(logFile);
        }
    }
    cleanupFile(logFile) {
        const baseName = path_1.default.basename(logFile);
        const directory = path_1.default.dirname(logFile);
        const files = fs_1.default.readdirSync(directory)
            .filter(file => file.startsWith(baseName) && file !== baseName)
            .map(file => ({
            name: file,
            path: path_1.default.join(directory, file),
            stats: fs_1.default.statSync(path_1.default.join(directory, file))
        }))
            .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
        if (files.length > this.config.maxFiles) {
            const filesToRemove = files.slice(this.config.maxFiles);
            for (const file of filesToRemove) {
                try {
                    fs_1.default.unlinkSync(file.path);
                    logger_1.logger.debug('Removed old log file', 'log-rotator', { file: file.name });
                }
                catch (error) {
                    logger_1.logger.error('Error removing old log file', 'log-rotator', {
                        error,
                        file: file.name
                    });
                }
            }
        }
    }
    getRotationStats() {
        const logFiles = this.getLogFiles();
        const stats = {
            totalFiles: logFiles.length,
            files: logFiles.map(file => {
                const fileStats = fs_1.default.statSync(file);
                return {
                    name: path_1.default.basename(file),
                    size: fileStats.size,
                    lastModified: fileStats.mtime,
                    sizeMB: Math.round(fileStats.size / 1024 / 1024 * 100) / 100
                };
            }),
            config: {
                maxSize: this.config.maxSize,
                maxFiles: this.config.maxFiles,
                compress: this.config.compress
            }
        };
        return stats;
    }
    forceRotation() {
        logger_1.logger.info('Manual log rotation requested', 'log-rotator');
        this.rotateLogs();
    }
    stop() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
        logger_1.logger.info('Log rotation stopped', 'log-rotator');
    }
}
const logRotator = new LogRotator();
exports.logRotator = logRotator;
const logRotationMiddleware = (req, res, next) => {
    next();
};
exports.logRotationMiddleware = logRotationMiddleware;
const getLogRotationStats = (req, res) => {
    try {
        const stats = logRotator.getRotationStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting log rotation stats', 'log-rotator', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to get log rotation statistics'
        });
    }
};
exports.getLogRotationStats = getLogRotationStats;
const forceLogRotation = (req, res) => {
    try {
        logRotator.forceRotation();
        res.json({
            success: true,
            message: 'Log rotation completed',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error during manual log rotation', 'log-rotator', { error });
        res.status(500).json({
            success: false,
            error: 'Failed to perform log rotation'
        });
    }
};
exports.forceLogRotation = forceLogRotation;
process.on('SIGTERM', () => {
    logRotator.stop();
});
process.on('SIGINT', () => {
    logRotator.stop();
});
//# sourceMappingURL=logRotation.js.map