/**
 * Validation utilities for API responses and data
 */
import { Bus, Route, Driver, BusLocation } from '../types';
import errorHandler, { ErrorType, ErrorSeverity } from './errorHandler';

/**
 * Validates if the provided value is a valid object
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates if the provided value is a valid array
 */
export function isArray(value: unknown): value is any[] {
  return Array.isArray(value);
}

/**
 * Validates if the provided value is a valid string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Validates if the provided value is a valid number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Validates if the provided value is a valid boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Validates if the provided value is a valid date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Validates if the provided value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  return regex.test(value);
}

/**
 * Validates if the provided value is a valid UUID
 */
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(value);
}

/**
 * Validates if the provided value is a valid Bus object
 */
export function isBus(value: unknown): value is Bus {
  if (!isObject(value)) return false;
  
  return (
    isString(value.id) &&
    isString(value.code) &&
    isString(value.number_plate) &&
    isNumber(value.capacity) &&
    isBoolean(value.is_active)
  );
}

/**
 * Validates if the provided value is a valid Route object
 */
export function isRoute(value: unknown): value is Route {
  if (!isObject(value)) return false;
  
  return (
    isString(value.id) &&
    isString(value.name) &&
    isBoolean(value.is_active)
  );
}

/**
 * Validates if the provided value is a valid Driver object
 */
export function isDriver(value: unknown): value is Driver {
  if (!isObject(value)) return false;
  
  return (
    isString(value.id) &&
    (isString(value.driver_name) || isString(value.driver_id))
  );
}

/**
 * Validates if the provided value is a valid BusLocation object
 */
export function isBusLocation(value: unknown): value is BusLocation {
  if (!isObject(value)) return false;
  
  return (
    isString(value.busId) &&
    isNumber(value.latitude) &&
    isNumber(value.longitude) &&
    isString(value.timestamp)
  );
}

/**
 * Validates an array of items against a validator function
 */
export function validateArray<T>(
  array: unknown,
  validator: (item: unknown) => item is T
): T[] | null {
  if (!isArray(array)) {
    return null;
  }
  
  const validItems: T[] = [];
  const invalidItems: unknown[] = [];
  
  array.forEach((item) => {
    if (validator(item)) {
      validItems.push(item);
    } else {
      invalidItems.push(item);
    }
  });
  
  // Log invalid items for debugging
  if (invalidItems.length > 0) {
    const error = errorHandler.createError(
      ErrorType.VALIDATION,
      `Found ${invalidItems.length} invalid items in array`,
      ErrorSeverity.WARNING,
      invalidItems,
      { validCount: validItems.length, invalidCount: invalidItems.length }
    );
    
    errorHandler.logError(error);
  }
  
  return validItems;
}

/**
 * Validates a Bus array
 */
export function validateBusArray(array: unknown): Bus[] {
  return validateArray(array, isBus) || [];
}

/**
 * Validates a Route array
 */
export function validateRouteArray(array: unknown): Route[] {
  return validateArray(array, isRoute) || [];
}

/**
 * Validates a Driver array
 */
export function validateDriverArray(array: unknown): Driver[] {
  return validateArray(array, isDriver) || [];
}

/**
 * Validates a BusLocation array
 */
export function validateBusLocationArray(array: unknown): BusLocation[] {
  return validateArray(array, isBusLocation) || [];
}

export default {
  isObject,
  isArray,
  isString,
  isNumber,
  isBoolean,
  isDate,
  isISODateString,
  isUUID,
  isBus,
  isRoute,
  isDriver,
  isBusLocation,
  validateArray,
  validateBusArray,
  validateRouteArray,
  validateDriverArray,
  validateBusLocationArray,
};
