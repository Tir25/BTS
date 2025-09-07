// Firefox-specific compatibility fixes for real-time services
export interface FirefoxCompatibilityConfig {
  eventSource: {
    useNative: boolean;
    fallbackTimeout: number;
    retryAttempts: number;
  };
  fetch: {
    useNative: boolean;
    timeout: number;
    retryAttempts: number;
  };
  websocket: {
    useNative: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };
}

// Detect Firefox version and apply compatibility fixes
export const detectFirefoxCompatibility = (): FirefoxCompatibilityConfig => {
  const userAgent = navigator.userAgent;
  const isFirefox = userAgent.includes('Firefox');
  const firefoxVersion = isFirefox
    ? parseInt(userAgent.match(/Firefox\/(\d+)/)?.[1] || '0')
    : 0;

  console.log(
    '🦊 Firefox detected - using Firefox-specific EventSource configuration'
  );

  return {
    eventSource: {
      useNative: firefoxVersion >= 79, // Firefox 79+ has good EventSource support
      fallbackTimeout: 30000,
      retryAttempts: 3,
    },
    fetch: {
      useNative: firefoxVersion >= 60, // Firefox 60+ has good fetch support
      timeout: 30000,
      retryAttempts: 3,
    },
    websocket: {
      useNative: firefoxVersion >= 70, // Firefox 70+ has good WebSocket support
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
    },
  };
};

// Firefox-compatible EventSource implementation
export class FirefoxCompatibleEventSource {
  private eventSource: EventSource | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private config: FirefoxCompatibilityConfig;
  private url: string;
  private listeners: Map<string, EventListener[]> = new Map();

  constructor(url: string, config?: FirefoxCompatibilityConfig) {
    this.url = url;
    this.config = config || detectFirefoxCompatibility();
  }

  addEventListener(
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);

    // Also add to native EventSource if available
    if (this.eventSource) {
      this.eventSource.addEventListener(type, listener, options);
    }
  }

  removeEventListener(
    type: string,
    listener: EventListener,
    options?: boolean | EventListenerOptions
  ): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const index = typeListeners.indexOf(listener);
      if (index > -1) {
        typeListeners.splice(index, 1);
      }
    }

    // Also remove from native EventSource if available
    if (this.eventSource) {
      this.eventSource.removeEventListener(type, listener, options);
    }
  }

  open(): void {
    if (this.config.eventSource.useNative) {
      this.openNative();
    } else {
      this.openFallback();
    }
  }

  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  private openNative(): void {
    try {
      this.eventSource = new EventSource(this.url);
      this.setupNativeListeners();
    } catch (error) {
      console.warn(
        'Native EventSource failed, falling back to polling:',
        error
      );
      this.openFallback();
    }
  }

  private openFallback(): void {
    console.log(
      '🦊 Firefox detected - using Firefox-specific fetch configuration'
    );

    // Implement polling fallback
    this.fallbackInterval = setInterval(async () => {
      try {
        const response = await fetch(this.url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(this.config.eventSource.fallbackTimeout),
        });

        if (response.ok) {
          const reader = response.body?.getReader();
          if (reader) {
            this.processStreamData(reader);
          }
        }
      } catch (error) {
        console.warn('Fallback EventSource error:', error);
      }
    }, 1000);
  }

  private setupNativeListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.triggerEvent('open', new Event('open'));
    };

    this.eventSource.onerror = error => {
      this.triggerEvent('error', error);
    };

    this.eventSource.onmessage = event => {
      this.triggerEvent('message', event);
    };
  }

  private async processStreamData(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<void> {
    try {
      let reading = true;
      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          break;
        }

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data) {
              const event = new MessageEvent('message', { data });
              this.triggerEvent('message', event);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error processing stream data:', error);
    }
  }

  private triggerEvent(type: string, event: Event): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener.call(this, event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }
}

// Firefox-compatible fetch with timeout and retry
export const firefoxCompatibleFetch = async (
  url: string,
  options: RequestInit = {},
  config?: FirefoxCompatibilityConfig
): Promise<Response> => {
  const fetchConfig = config || detectFirefoxCompatibility();
  const timeout =
    options.signal || AbortSignal.timeout(fetchConfig.fetch.timeout);

  // Check if we need to use fetch polyfill
  if (
    navigator.userAgent.includes('Firefox') &&
    (navigator.userAgent.includes('Firefox/79') ||
      navigator.userAgent.includes('Firefox/78') ||
      navigator.userAgent.includes('Firefox/77'))
  ) {
    // Apply Firefox-specific fetch options
    const firefoxOptions = {
      ...options,
      signal: timeout,
      headers: {
        'User-Agent': navigator.userAgent,
        ...options.headers,
      },
    };

    return fetch(url, firefoxOptions);
  }

  // Use native fetch with timeout
  return fetch(url, { ...options, signal: timeout });
};

// Export default configuration
export default detectFirefoxCompatibility();
