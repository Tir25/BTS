/**
 * Utility for testing dynamic import error handling
 * This can be used to simulate dynamic import failures for testing
 */

export const simulateDynamicImportError = () => {
  // Simulate a dynamic import error by throwing an error with the expected message
  const error = new Error('error loading dynamically imported module: http://localhost:5173/src/components/UnifiedDriverInterface.tsx');
  throw error;
};

export const testRetryLogic = async (importFunction: () => Promise<any>, maxRetries = 2) => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to load module...`);
      const result = await importFunction();
      console.log('Module loaded successfully');
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed');
        throw lastError;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
};

export const checkModuleAvailability = async (modulePath: string) => {
  try {
    // Try to fetch the module to check if it's available
    const response = await fetch(modulePath);
    return response.ok;
  } catch (error) {
    console.warn('Module availability check failed:', error);
    return false;
  }
};
