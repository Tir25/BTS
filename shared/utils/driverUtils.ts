import { Driver } from '../types';

/**
 * Deduplicates drivers array by ID, preferring entries with more complete data
 * @param drivers Array of drivers to deduplicate
 * @returns Deduplicated array of drivers
 */
export const deduplicateDrivers = (drivers: Driver[]): Driver[] => {
  const uniqueDriversMap = new Map<string, Driver>();
  
  drivers.forEach((driver: Driver) => {
    const idKey = driver.id;

    if (!uniqueDriversMap.has(idKey)) {
      // First time seeing this ID
      uniqueDriversMap.set(idKey, driver);
    } else {
      // We already have this ID, check if we should replace it
      const existing = uniqueDriversMap.get(idKey);

      if (!existing) return;

      // Prefer the entry with email over null email
      if (!existing.email && driver.email) {
        uniqueDriversMap.set(idKey, driver);
      }
      // If both have emails, prefer the one with more complete data
      else if (existing.email && driver.email) {
        // Keep the existing one unless the new one has more complete data
        if (!existing.first_name && driver.first_name) {
          uniqueDriversMap.set(idKey, driver);
        }
      }
    }
  });
  
  return Array.from(uniqueDriversMap.values());
};

/**
 * Validates driver data completeness
 * @param driver Driver object to validate
 * @returns Object with validation result and missing fields
 */
export const validateDriverData = (driver: Driver): {
  isValid: boolean;
  missingFields: string[];
} => {
  const missingFields: string[] = [];
  
  if (!driver.email) missingFields.push('email');
  if (!driver.first_name && !driver.full_name) missingFields.push('name');
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};
