// Console filter utility to suppress expected warnings in development
export const setupConsoleFilter = () => {
  if (import.meta.env.DEV) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];

      // Filter out React Router future flag warnings
      if (
        typeof message === 'string' &&
        (message.includes('React Router Future Flag Warning') ||
          message.includes('v7_startTransition') ||
          message.includes('v7_relativeSplatPath'))
      ) {
        return; // Suppress these warnings
      }

      // Filter out WebGL context lost warnings (normal in development)
      if (
        typeof message === 'string' &&
        message.includes('WebGL context was lost')
      ) {
        return; // Suppress these warnings
      }

      // Filter out Firefox WebSocket connection warnings during page load
      if (
        typeof message === 'string' &&
        (message.includes("Firefox can't establish a connection") ||
          message.includes(
            'connection was interrupted while the page was loading'
          ))
      ) {
        return; // Suppress these warnings
      }

      // Log all other warnings normally
      originalWarn.apply(console, args);
    };
  }
};
