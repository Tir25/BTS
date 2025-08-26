import { Response } from 'express';

// Standard error response helper
export const createErrorResponse = (
  _statusCode: number,
  error: string,
  message: string,
  details?: any
) => ({
  success: false,
  error,
  message,
  timestamp: new Date().toISOString(),
  ...(details && { details }),
});

// Standard success response helper
export const createSuccessResponse = (
  data: any,
  message?: string,
  _statusCode: number = 200
) => ({
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
  details?: any
) => {
  return res.status(statusCode).json(
    createErrorResponse(statusCode, error, message, details)
  );
};

// Send standardized success response
export const sendSuccessResponse = (
  res: Response,
  data: any,
  message?: string,
  statusCode: number = 200
) => {
  return res.status(statusCode).json(
    createSuccessResponse(data, message, statusCode)
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
