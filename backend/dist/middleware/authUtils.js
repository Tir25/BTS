"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminEmails = getAdminEmails;
exports.getAuthAttemptStore = getAuthAttemptStore;
exports.checkAndIncrementRateLimit = checkAndIncrementRateLimit;
const logger_1 = require("../utils/logger");
function getAdminEmails() {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim().toLowerCase()) || [];
    if (adminEmails.length === 0) {
        logger_1.logger.error('ADMIN_EMAILS environment variable is required', 'websocket');
    }
    return adminEmails;
}
function getAuthAttemptStore() {
    return (global.authAttemptStore || (global.authAttemptStore = new Map()));
}
function checkAndIncrementRateLimit(key, maxAttempts, windowMs, now) {
    return {
        limited: false,
        record: { count: 0, resetTime: now + windowMs }
    };
}
//# sourceMappingURL=authUtils.js.map