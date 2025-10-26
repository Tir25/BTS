/**
 * Centralized response utilities for the University Bus Tracking System
 * Provides consistent API response formatting
 */

import { Response } from 'express';
import { logger } from './logger';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export class ResponseHelper {
  /**
   * Send a successful response
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };

    logger.info(
      `Success response: ${statusCode}`,
      'api',
      { statusCode, hasData: !!data, message }
    );

    return res.status(statusCode).json(response);
  }

  /**
   * Send a successful response with pagination
   */
  static successWithPagination<T>(
    res: Response,
    data: T[],
    pagination: PaginationParams,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    };

    logger.info(
      `Success response with pagination: ${statusCode}`,
      'api',
      { statusCode, total: pagination.total, page: pagination.page }
    );

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  static error(
    res: Response,
    error: string,
    statusCode: number = 500,
    code?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      error,
      code,
      timestamp: new Date().toISOString(),
    };

    logger.error(
      `Error response: ${statusCode}`,
      'api',
      { statusCode, error, code }
    );

    return res.status(statusCode).json(response);
  }

  /**
   * Send a validation error response
   */
  static validationError(
    res: Response,
    error: string,
    code: string = 'VALIDATION_ERROR'
  ): Response {
    return this.error(res, error, 400, code);
  }

  /**
   * Send a not found error response
   */
  static notFound(
    res: Response,
    resource: string = 'Resource'
  ): Response {
    return this.error(res, `${resource} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Send an unauthorized error response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Send a forbidden error response
   */
  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Send a conflict error response
   */
  static conflict(
    res: Response,
    message: string = 'Resource already exists'
  ): Response {
    return this.error(res, message, 409, 'CONFLICT');
  }

  /**
   * Send a service unavailable error response
   */
  static serviceUnavailable(
    res: Response,
    message: string = 'Service temporarily unavailable'
  ): Response {
    return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
  }

  /**
   * Send a created response
   */
  static created<T>(
    res: Response,
    data: T,
    message?: string
  ): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * Send a no content response
   */
  static noContent(res: Response): Response {
    logger.info('No content response: 204', 'api');
    return res.status(204).send();
  }

  /**
   * Send a bad request response
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request'
  ): Response {
    return this.error(res, message, 400, 'BAD_REQUEST');
  }

  /**
   * Send a method not allowed response
   */
  static methodNotAllowed(
    res: Response,
    method: string
  ): Response {
    return this.error(res, `Method ${method} not allowed`, 405, 'METHOD_NOT_ALLOWED');
  }

  /**
   * Send a too many requests response
   */
  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests'
  ): Response {
    return this.error(res, message, 429, 'RATE_LIMIT_EXCEEDED');
  }

  /**
   * Send an internal server error response
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return this.error(res, message, 500, 'INTERNAL_ERROR');
  }
}

// Export convenience functions
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
) => ResponseHelper.success(res, data, message, statusCode);

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string
) => ResponseHelper.error(res, error, statusCode, code);

export const sendValidationError = (
  res: Response,
  error: string,
  code: string = 'VALIDATION_ERROR'
) => ResponseHelper.validationError(res, error, code);

export const sendNotFound = (
  res: Response,
  resource: string = 'Resource'
) => ResponseHelper.notFound(res, resource);

export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access'
) => ResponseHelper.unauthorized(res, message);

export const sendForbidden = (
  res: Response,
  message: string = 'Access forbidden'
) => ResponseHelper.forbidden(res, message);

export const sendConflict = (
  res: Response,
  message: string = 'Resource already exists'
) => ResponseHelper.conflict(res, message);

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
) => ResponseHelper.created(res, data, message);

export const sendNoContent = (res: Response) => ResponseHelper.noContent(res);

export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request'
) => ResponseHelper.badRequest(res, message);

export const sendInternalError = (
  res: Response,
  message: string = 'Internal server error'
) => ResponseHelper.internalError(res, message);
