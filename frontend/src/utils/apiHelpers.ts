/**
 * API Helper utilities for consistent API response handling
 */
import { ApiResponse } from '../services/interfaces/IApiService';
import errorHandler, { ErrorType, ErrorSeverity } from './errorHandler';
import validation from './validation';

/**
 * Generic function to handle API responses with validation
 * @param response The API response to handle
 * @param validator Function to validate the response data
 * @param entityName Name of the entity being validated (e.g., 'bus', 'route')
 * @param endpoint API endpoint that was called
 * @param entityId Optional ID of the specific entity
 */
export function handleApiResponse<T, V>(
  response: ApiResponse<T>,
  validator: (data: unknown) => data is V,
  entityName: string,
  endpoint: string,
  entityId?: string
): ApiResponse<V | null> {
  if (response.success && response.data) {
    // Validate the response data
    if (validator(response.data)) {
      return {
        success: true,
        data: response.data,
        timestamp: response.timestamp || new Date().toISOString(),
      };
    } else {
      // Log error about invalid data
      const error = errorHandler.createError(
        ErrorType.VALIDATION,
        `Received invalid ${entityName} data${entityId ? ` for ID ${entityId}` : ''}`,
        ErrorSeverity.ERROR,
        response.data,
        { endpoint, entityId }
      );
      
      errorHandler.logError(error);
      
      return {
        success: false,
        data: null,
        timestamp: new Date().toISOString(),
        error: `Invalid ${entityName} data received${entityId ? ` for ID ${entityId}` : ''}`,
        message: `The ${entityName} information received from the server was invalid`,
      };
    }
  } else {
    // Handle unsuccessful response
    const error = errorHandler.createError(
      ErrorType.SERVER,
      response.message || response.error || `Failed to fetch ${entityName}${entityId ? ` with ID ${entityId}` : 's'}`,
      ErrorSeverity.ERROR,
      response,
      { endpoint, entityId }
    );
    
    errorHandler.logError(error);
    
    return {
      success: false,
      data: null,
      timestamp: new Date().toISOString(),
      error: response.error || `Failed to fetch ${entityName}${entityId ? ` with ID ${entityId}` : 's'}`,
      message: response.message || `An error occurred while fetching ${entityName} information`,
    };
  }
}

/**
 * Generic function to handle API responses with array validation
 * @param response The API response to handle
 * @param validator Function to validate each item in the array
 * @param entityName Name of the entity being validated (e.g., 'buses', 'routes')
 * @param endpoint API endpoint that was called
 */
export function handleApiArrayResponse<T, V>(
  response: ApiResponse<T[]>,
  validator: (data: unknown) => data is V,
  entityName: string,
  endpoint: string
): ApiResponse<V[]> {
  if (response.success && response.data) {
    // Validate the response data
    const validatedItems = validation.validateArray(response.data, validator) || [];
    
    // Check if any items were invalid
    if (validatedItems.length !== response.data.length) {
      // Log warning about invalid data
      const error = errorHandler.createError(
        ErrorType.VALIDATION,
        `Received ${response.data.length} ${entityName}, but only ${validatedItems.length} were valid`,
        ErrorSeverity.WARNING,
        { 
          totalCount: response.data.length, 
          validCount: validatedItems.length,
          invalidCount: response.data.length - validatedItems.length
        },
        { endpoint }
      );
      
      errorHandler.logError(error);
    }
    
    return {
      success: true,
      data: validatedItems,
      timestamp: response.timestamp || new Date().toISOString(),
    };
  } else {
    // Handle unsuccessful response
    const error = errorHandler.createError(
      ErrorType.SERVER,
      response.message || response.error || `Failed to fetch ${entityName}`,
      ErrorSeverity.ERROR,
      response,
      { endpoint }
    );
    
    errorHandler.logError(error);
    
    return {
      success: false,
      data: [],
      timestamp: new Date().toISOString(),
      error: response.error || `Failed to fetch ${entityName}`,
      message: response.message || `An error occurred while fetching ${entityName}`,
    };
  }
}

/**
 * Generic function to handle API errors
 * @param error The error to handle
 * @param defaultMessage Default error message
 * @param entityName Name of the entity being fetched
 * @param entityId Optional ID of the specific entity
 */
export function handleApiError<T>(
  error: unknown,
  defaultMessage: string,
  _entityName?: string,
  _entityId?: string
): ApiResponse<T> {
  // Use the error handler to process the error
  const appError = errorHandler.handleApiError(
    error, 
    defaultMessage
  );
  
  return {
    success: false,
    data: null as unknown as T, // Cast to T to satisfy return type
    timestamp: new Date().toISOString(),
    error: appError.message,
    message: errorHandler.getUserFriendlyMessage(appError),
  };
}

/**
 * Generic function to handle parameter validation errors
 * @param paramName Name of the parameter that is invalid
 * @param entityName Name of the entity being validated
 * @param functionName Name of the function where validation failed
 */
export function handleParamValidationError<T>(
  paramName: string,
  entityName: string,
  functionName: string
): ApiResponse<T> {
  // Create validation error
  const error = errorHandler.createError(
    ErrorType.VALIDATION,
    `${paramName} is required`,
    ErrorSeverity.WARNING,
    null,
    { function: functionName }
  );
  
  errorHandler.logError(error);
  
  return {
    success: false,
    data: null as unknown as T, // Cast to T to satisfy return type
    timestamp: new Date().toISOString(),
    error: `${paramName} is required`,
    message: `Please provide a valid ${paramName.toLowerCase()} to fetch ${entityName} information`,
  };
}

export default {
  handleApiResponse,
  handleApiArrayResponse,
  handleApiError,
  handleParamValidationError,
};
