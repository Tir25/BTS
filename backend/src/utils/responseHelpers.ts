import { Response } from 'express';

// Type definitions for better type safety
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface ErrorDetails {
  field?: string;
  code?: string;
  [key: string]: unknown;
}

// Standard error response helper
export const createErrorResponse = (
  _statusCode: number,
  error: string,
  message: string,
  details?: ErrorDetails
): ApiResponse => ({
  success: false,
  error,
  message,
  timestamp: new Date().toISOString(),
  ...(details && { details }),
});

// Standard success response helper
export const createSuccessResponse = <T = unknown>(
  data: T,
  message?: string,
  _statusCode: number = 200
): ApiResponse<T> => ({
  success: true,
  data,
  ...(message && { message }),
  timestamp: new Date().toISOString(),
});

// Send standardized error response
export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  error: string,
  message: string,
  details?: ErrorDetails
) => {
  return res.status(statusCode).json(
    createErrorResponse(statusCode, error, message, details)
  );
};

// Send standardized success response
export const sendSuccessResponse = <T = unknown>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
) => {
  return res.status(statusCode).json(
    createSuccessResponse<T>(data, message, statusCode)
  );
};

// Validation error response
export const sendValidationError = (
  res: Response,
  field: string,
  message: string
) => {
  return sendErrorResponse(
    res,
    400,
    'Validation Error',
    message,
    { field }
  );
};

// Not found error response
export const sendNotFoundError = (
  res: Response,
  resource: string,
  id: string
) => {
  return sendErrorResponse(
    res,
    404,
    'Not Found',
    `${resource} with ID ${id} not found`
  );
};

// Unauthorized error response
export const sendUnauthorizedError = (
  res: Response,
  message: string = 'Authentication required'
) => {
  return sendErrorResponse(
    res,
    401,
    'Unauthorized',
    message
  );
};

// Forbidden error response
export const sendForbiddenError = (
  res: Response,
  message: string = 'Access denied'
) => {
  return sendErrorResponse(
    res,
    403,
    'Forbidden',
    message
  );
};

// Internal server error response
export const sendInternalServerError = (
  res: Response,
  error?: Error
) => {
  return sendErrorResponse(
    res,
    500,
    'Internal Server Error',
    error?.message || 'Something went wrong'
  );
};
