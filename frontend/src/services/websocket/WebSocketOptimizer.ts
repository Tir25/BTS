// WebSocket Optimization Utilities

export interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeout: number;
  heartbeatInterval: number;
  compressionThreshold: number;
  messageQueueSize: number;
}

export interface OptimizedMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  compressed?: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  failedConnections: number;
  averageLatency: number;
  messagesPerSecond: number;
  compressionRatio: number;
}

class WebSocketOptimizer {
  private config: ConnectionPoolConfig;
  private connections: Map<string, WebSocket> = new Map();
  private messageQueue: OptimizedMessage[] = [];
  private metrics: ConnectionMetrics;
  private compressionWorker: Worker | null = null;
  private isCompressionSupported: boolean = false;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: 3,
      idleTimeout: 30000, // 30 seconds
      heartbeatInterval: 10000, // 10 seconds
      compressionThreshold: 1024, // 1KB
      messageQueueSize: 100,
      ...config,
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      messagesPerSecond: 0,
      compressionRatio: 0,
    };

    this.initializeCompression();
  }

  // Initialize compression worker
  private async initializeCompression(): Promise<void> {
    try {
      // Check if compression is supported
      this.isCompressionSupported = 'CompressionStream' in window;
      
      if (this.isCompressionSupported) {
        console.log('✅ WebSocket compression supported');
      } else {
        console.log('⚠️ WebSocket compression not supported, using fallback');
      }
    } catch (error) {
      console.error('❌ Failed to initialize compression:', error);
      this.isCompressionSupported = false;
    }
  }

  // Compress message if needed
  async compressMessage(message: OptimizedMessage): Promise<OptimizedMessage> {
    if (!this.isCompressionSupported || 
        JSON.stringify(message.data).length < this.config.compressionThreshold) {
      return message;
    }

    try {
      const compressed = await this.compressData(message.data);
      return {
        ...message,
        data: compressed,
        compressed: true,
      };
    } catch (error) {
      console.warn('⚠️ Compression failed, sending uncompressed:', error);
      return message;
    }
  }

  // Decompress message
  async decompressMessage(message: OptimizedMessage): Promise<OptimizedMessage> {
    if (!message.compressed) {
      return message;
    }

    try {
      const decompressed = await this.decompressData(message.data);
      return {
        ...message,
        data: decompressed,
        compressed: false,
      };
    } catch (error) {
      console.error('❌ Decompression failed:', error);
      throw error;
    }
  }

  // Compress data using native compression
  private async compressData(data: any): Promise<string> {
    if (!this.isCompressionSupported) {
      return JSON.stringify(data);
    }

    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Write data
    await writer.write(encoder.encode(jsonString));
    await writer.close();

    // Read compressed data
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Convert to base64
    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    return btoa(String.fromCharCode(...compressed));
  }

  // Decompress data using native decompression
  private async decompressData(compressedData: string): Promise<any> {
    if (!this.isCompressionSupported) {
      return JSON.parse(compressedData);
    }

    // Convert from base64
    const binaryString = atob(compressedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Write compressed data
    await writer.write(bytes);
    await writer.close();

    // Read decompressed data
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Convert back to string
    const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decompressed);
    return JSON.parse(jsonString);
  }

  // Create optimized message
  createMessage(type: string, data: any, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): OptimizedMessage {
    return {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: Date.now(),
      priority,
    };
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Queue message for sending
  queueMessage(message: OptimizedMessage): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      // Remove oldest low priority message
      const lowPriorityIndex = this.messageQueue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        // Remove oldest message if no low priority messages
        this.messageQueue.shift();
      }
    }

    // Insert message based on priority
    const insertIndex = this.messageQueue.findIndex(m => 
      this.getPriorityValue(m.priority) < this.getPriorityValue(message.priority)
    );
    
    if (insertIndex === -1) {
      this.messageQueue.push(message);
    } else {
      this.messageQueue.splice(insertIndex, 0, message);
    }
  }

  // Get priority value for sorting
  private getPriorityValue(priority: string): number {
    const priorityMap = {
      'low': 0,
      'normal': 1,
      'high': 2,
      'critical': 3,
    };
    return priorityMap[priority as keyof typeof priorityMap] || 1;
  }

  // Process message queue
  async processMessageQueue(sendFunction: (message: OptimizedMessage) => Promise<void>): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        const compressedMessage = await this.compressMessage(message);
        await sendFunction(compressedMessage);
        this.updateMetrics('sent');
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        this.updateMetrics('failed');
        
        // Re-queue critical messages
        if (message.priority === 'critical') {
          this.queueMessage(message);
        }
      }
    }
  }

  // Update connection metrics
  updateMetrics(event: 'connected' | 'disconnected' | 'failed' | 'sent' | 'received'): void {
    switch (event) {
      case 'connected':
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
        break;
      case 'disconnected':
        this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
        break;
      case 'failed':
        this.metrics.failedConnections++;
        break;
      case 'sent':
      case 'received':
        // Update messages per second (simplified)
        this.metrics.messagesPerSecond = this.calculateMessagesPerSecond();
        break;
    }
  }

  // Calculate messages per second
  private calculateMessagesPerSecond(): number {
    // Simplified calculation - in real implementation, you'd track timestamps
    return this.metrics.messagesPerSecond;
  }

  // Get connection metrics
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      averageLatency: 0,
      messagesPerSecond: 0,
      compressionRatio: 0,
    };
  }

  // Cleanup
  destroy(): void {
    this.messageQueue = [];
    this.connections.clear();
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }
}

export const webSocketOptimizer = new WebSocketOptimizer();

