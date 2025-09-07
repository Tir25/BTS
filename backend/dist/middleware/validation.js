"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileUpload = exports.validateRateLimit = exports.sanitizeInput = exports.validateParams = exports.validateQuery = exports.validateBody = exports.validate = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            if (schema.query) {
                req.query = schema.query.parse(req.query);
            }
            if (schema.params) {
                req.params = schema.params.parse(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const validationError = new errors_1.ValidationError('Request validation failed', {
                    errors: error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                        received: err.received,
                    })),
                    receivedData: {
                        body: req.body,
                        query: req.query,
                        params: req.params,
                    },
                });
                return next(validationError);
            }
            next(error);
        }
    };
};
exports.validate = validate;
const validateBody = (schema) => {
    return (0, exports.validate)({ body: schema });
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (0, exports.validate)({ query: schema });
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (0, exports.validate)({ params: schema });
};
exports.validateParams = validateParams;
const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        return str
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    };
    const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }
        return obj;
    };
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
const validateRateLimit = (maxRequests, windowMs) => {
    const requests = new Map();
    return (req, res, next) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        for (const [id, data] of requests.entries()) {
            if (data.resetTime < now) {
                requests.delete(id);
            }
        }
        let clientData = requests.get(clientId);
        if (!clientData || clientData.resetTime < now) {
            clientData = { count: 0, resetTime: now + windowMs };
            requests.set(clientId, clientData);
        }
        if (clientData.count >= maxRequests) {
            return res.status(429).json({
                error: {
                    name: 'RateLimitError',
                    message: 'Too many requests',
                    statusCode: 429,
                    timestamp: new Date().toISOString(),
                    retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
                },
            });
        }
        clientData.count++;
        return next();
    };
};
exports.validateRateLimit = validateRateLimit;
const validateFileUpload = (options) => {
    return (req, res, next) => {
        const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], required = false } = options;
        if (required && (!req.file && !req.files)) {
            return res.status(400).json({
                error: {
                    name: 'ValidationError',
                    message: 'File upload is required',
                    statusCode: 400,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : (req.file ? [req.file] : []);
        for (const file of files) {
            if (file.size > maxSize) {
                return res.status(400).json({
                    error: {
                        name: 'ValidationError',
                        message: `File size exceeds maximum allowed size of ${maxSize} bytes`,
                        statusCode: 400,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
            if (!allowedTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    error: {
                        name: 'ValidationError',
                        message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
                        statusCode: 400,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }
        return next();
    };
};
exports.validateFileUpload = validateFileUpload;
//# sourceMappingURL=validation.js.map