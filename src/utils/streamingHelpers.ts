/**
 * Streaming Helpers and Error Handling Utilities
 * Provides robust error handling, retry mechanisms, and performance monitoring for streaming operations
 */

import { ConnectionStatus } from '../types.js';

// Error Types
export type ErrorType = 'network' | 'authentication' | 'rate_limit' | 'server_error' | 'timeout' | 'abort' | 'unknown';

export type StreamRecoveryAction = 'retry' | 'reauthenticate' | 'backoff' | 'circuit_break' | 'fallback' | 'fail';

export interface StreamError extends Error {
  type: ErrorType;
  retryable: boolean;
  statusCode?: number;
  retryAfter?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  lastFailure: number;
  failureCount: number;
  nextRetryTime: number;
}

// Default Configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

// Enhanced Error Handler
export class StreamErrorHandler {
  private errorCounts = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly circuitBreakerTimeout = 60000; // 1 minute
  private readonly maxFailuresBeforeBreak = 5;

  categorizeError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name === 'aborterror' || message.includes('abort')) {
      return 'abort';
    }
    if (name === 'timeouterror' || message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('401') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'authentication';
    }
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many')) {
      return 'rate_limit';
    }
    if (message.includes('5') && (message.includes('server') || message.includes('internal'))) {
      return 'server_error';
    }

    return 'unknown';
  }

  createStreamError(originalError: Error, statusCode?: number): StreamError {
    const type = this.categorizeError(originalError);
    const retryable = this.isRetryable(type);
    
    const streamError = new Error(originalError.message) as StreamError;
    streamError.name = 'StreamError';
    streamError.type = type;
    streamError.retryable = retryable;
    streamError.statusCode = statusCode;
    streamError.stack = originalError.stack;
    
    // Extract retry-after header value if present
    if (type === 'rate_limit') {
      const retryAfterMatch = originalError.message.match(/retry[- ]after[:\s](\d+)/i);
      if (retryAfterMatch) {
        streamError.retryAfter = parseInt(retryAfterMatch[1]) * 1000; // Convert to ms
      }
    }
    
    return streamError;
  }

  private isRetryable(errorType: ErrorType): boolean {
    switch (errorType) {
      case 'network':
      case 'timeout':
      case 'server_error':
        return true;
      case 'rate_limit':
        return true; // But with delay
      case 'authentication':
      case 'abort':
      case 'unknown':
        return false;
      default:
        return false;
    }
  }

  handleStreamError(error: Error, streamId: string): StreamRecoveryAction {
    const streamError = this.createStreamError(error);
    const errorType = streamError.type;
    const errorCount = this.errorCounts.get(streamId) ?? 0;
    
    this.errorCounts.set(streamId, errorCount + 1);
    
    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(streamId);
    if (circuitBreaker && this.isCircuitOpen(circuitBreaker)) {
      return 'circuit_break';
    }
    
    // Update circuit breaker state
    this.updateCircuitBreaker(streamId);
    
    switch (errorType) {
      case 'network':
      case 'timeout':
        if (errorCount < DEFAULT_RETRY_CONFIG.maxRetries) return 'retry';
        return 'circuit_break';
        
      case 'authentication':
        return 'reauthenticate';
        
      case 'rate_limit':
        return 'backoff';
        
      case 'server_error':
        if (errorCount < 2) return 'retry';
        return 'fallback';
        
      case 'abort':
        return 'fail'; // User initiated, don't retry
        
      default:
        return 'fail';
    }
  }

  private isCircuitOpen(circuitBreaker: CircuitBreakerState): boolean {
    if (!circuitBreaker.isOpen) return false;
    
    const now = Date.now();
    if (now >= circuitBreaker.nextRetryTime) {
      // Half-open state - allow one retry
      circuitBreaker.isOpen = false;
      return false;
    }
    
    return true;
  }

  private updateCircuitBreaker(streamId: string) {
    const now = Date.now();
    let circuitBreaker = this.circuitBreakers.get(streamId);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        isOpen: false,
        lastFailure: now,
        failureCount: 1,
        nextRetryTime: 0,
      };
    } else {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailure = now;
    }
    
    // Open circuit if too many failures
    if (circuitBreaker.failureCount >= this.maxFailuresBeforeBreak) {
      circuitBreaker.isOpen = true;
      circuitBreaker.nextRetryTime = now + this.circuitBreakerTimeout;
    }
    
    this.circuitBreakers.set(streamId, circuitBreaker);
  }

  resetCircuitBreaker(streamId: string) {
    this.circuitBreakers.delete(streamId);
    this.errorCounts.delete(streamId);
  }

  cleanup() {
    this.errorCounts.clear();
    this.circuitBreakers.clear();
  }
}

// Retry Logic with Exponential Backoff
export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  calculateDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter;
    }

    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    errorHandler: StreamErrorHandler,
    streamId: string,
    onRetry?: (attempt: number, error: StreamError) => void
  ): Promise<T> {
    let lastError: StreamError;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Success - reset circuit breaker
        errorHandler.resetCircuitBreaker(streamId);
        return result;
        
      } catch (error) {
        const streamError = errorHandler.createStreamError(error as Error);
        lastError = streamError;
        
        const action = errorHandler.handleStreamError(streamError, streamId);
        
        if (attempt === this.config.maxRetries || action === 'fail' || action === 'circuit_break') {
          throw streamError;
        }
        
        if (action === 'retry' || action === 'backoff') {
          const delay = this.calculateDelay(attempt, streamError.retryAfter);
          
          onRetry?.(attempt + 1, streamError);
          await this.sleep(delay);
          continue;
        }
        
        if (action === 'reauthenticate') {
          throw new Error(`Authentication required: ${streamError.message}`);
        }
        
        throw streamError;
      }
    }
    
    throw lastError!;
  }
}

// Performance Monitoring
export interface StreamMetrics {
  messageLatency: number[];
  throughput: number[];
  memoryUsage: number[];
  errorRate: number;
  connectionUptime: number;
  startTime: number;
}

export class StreamPerformanceMonitor {
  private metrics: StreamMetrics;
  private readonly maxSamples = 100;

  constructor() {
    this.metrics = {
      messageLatency: [],
      throughput: [],
      memoryUsage: [],
      errorRate: 0,
      connectionUptime: 0,
      startTime: Date.now(),
    };
  }

  trackMessageLatency(startTime: number, endTime: number) {
    const latency = endTime - startTime;
    this.metrics.messageLatency.push(latency);
    
    // Keep only recent samples
    if (this.metrics.messageLatency.length > this.maxSamples) {
      this.metrics.messageLatency.shift();
    }
    
    if (latency > 5000) { // Alert on high latency
      console.warn(`High message latency detected: ${latency}ms`);
    }
  }

  trackThroughput(messagesPerSecond: number) {
    this.metrics.throughput.push(messagesPerSecond);
    
    if (this.metrics.throughput.length > this.maxSamples) {
      this.metrics.throughput.shift();
    }
    
    if (messagesPerSecond > 50) {
      console.warn(`High throughput detected: ${messagesPerSecond} msgs/sec`);
    }
  }

  trackMemoryUsage() {
    const memUsage = (performance as any).memory?.usedJSHeapSize ?? 0;
    this.metrics.memoryUsage.push(memUsage);
    
    if (this.metrics.memoryUsage.length > this.maxSamples) {
      this.metrics.memoryUsage.shift();
    }
  }

  updateConnectionUptime(isConnected: boolean) {
    if (isConnected) {
      this.metrics.connectionUptime = Date.now() - this.metrics.startTime;
    } else {
      this.metrics.startTime = Date.now();
      this.metrics.connectionUptime = 0;
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getPerformanceReport() {
    return {
      avgLatency: Math.round(this.calculateAverage(this.metrics.messageLatency)),
      p95Latency: Math.round(this.calculatePercentile(this.metrics.messageLatency, 95)),
      avgThroughput: Math.round(this.calculateAverage(this.metrics.throughput)),
      currentMemoryMB: Math.round((this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] ?? 0) / (1024 * 1024)),
      uptimeSeconds: Math.round(this.metrics.connectionUptime / 1000),
      errorRate: this.metrics.errorRate,
      sampleCount: this.metrics.messageLatency.length,
    };
  }

  reset() {
    this.metrics = {
      messageLatency: [],
      throughput: [],
      memoryUsage: [],
      errorRate: 0,
      connectionUptime: 0,
      startTime: Date.now(),
    };
  }
}

// Connection Status Helpers
export function getConnectionStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return 'yellow';
    case 'connected':
      return 'green';
    case 'streaming':
      return 'blue';
    case 'error':
      return 'red';
    case 'stopped':
    case 'disconnected':
      return 'gray';
    default:
      return 'gray';
  }
}

export function getConnectionStatusIcon(status: ConnectionStatus): string {
  switch (status) {
    case 'connecting':
      return '🔄';
    case 'connected':
      return '🟢';
    case 'streaming':
      return '⚡';
    case 'error':
      return '🔴';
    case 'stopped':
      return '⏹️';
    case 'disconnected':
      return '⚫';
    default:
      return '⚫';
  }
}

// Singleton instances for global use
export const globalErrorHandler = new StreamErrorHandler();
export const globalRetryManager = new RetryManager();
export const globalPerformanceMonitor = new StreamPerformanceMonitor();