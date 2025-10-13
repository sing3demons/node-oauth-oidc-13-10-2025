import {
  LoggerContext,
  LogEntry,
  ConsoleFormat,
  LoggerConfig,
  LogLevel,
} from './types.js';
import { ConsoleFormatter } from './formatters/ConsoleFormatter.js';
import { FileFormatter } from './formatters/FileFormatter.js';
import { ConsoleTransport } from './transports/ConsoleTransport.js';
import { FileTransport } from './transports/FileTransport.js';

/**
 * SummaryLogger - High-performance summary logging
 * 
 * Features:
 * - Request/response timing
 * - Buffered file writing
 * - Periodic auto-flush
 * - Context inheritance
 * - Optimized timestamp caching
 */
export class SummaryLogger {
  private static instance: SummaryLogger;
  private static config: LoggerConfig = {
    consoleFormat: ConsoleFormat.JSON,
    enableFileLogging: false,
    logLevel: LogLevel.INFO,
  };

  private context: LoggerContext = {};
  private startTime?: number | undefined;
  private readonly consoleFormatter: ConsoleFormatter;
  private readonly fileFormatter: FileFormatter;
  private readonly consoleTransport: ConsoleTransport;
  private readonly fileTransport: FileTransport;

  // Performance optimization - shared buffer
  private logBuffer: string[] = [];
  private readonly bufferSize = 50;
  private flushTimer?: NodeJS.Timeout | undefined;
  private readonly flushInterval = 500;
  private lastFlushTime = Date.now();

  private constructor(logDir: string = 'logs/summary', filename: string = 'summary') {
    this.consoleFormatter = new ConsoleFormatter(SummaryLogger.config.consoleFormat);
    this.fileFormatter = new FileFormatter();
    this.consoleTransport = new ConsoleTransport();
    this.fileTransport = new FileTransport(SummaryLogger.config.enableFileLogging || false, logDir, filename);
    this.startFlushTimer();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SummaryLogger {
    if (!SummaryLogger.instance) {
      SummaryLogger.instance = new SummaryLogger();
    }
    return SummaryLogger.instance;
  }

  /**
   * Configure logger globally
   */
  static configure(config: Partial<LoggerConfig>): void {
    SummaryLogger.config = { ...SummaryLogger.config, ...config };
    // Note: Recreating formatter requires creating new instance
    if (SummaryLogger.instance && config.consoleFormat) {
      console.warn('Console format change requires logger restart to take effect');
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): LoggerConfig {
    return SummaryLogger.config;
  }

  /**
   * Create a new logger with additional context
   */
  withContext(context: LoggerContext): SummaryLogger {
    const newLogger = Object.create(SummaryLogger.prototype);
    newLogger.context = { ...this.context, ...context };
    newLogger.startTime = this.startTime;
    newLogger.consoleFormatter = this.consoleFormatter;
    newLogger.fileFormatter = this.fileFormatter;
    newLogger.consoleTransport = this.consoleTransport;
    newLogger.fileTransport = this.fileTransport;

    // Share buffer and timer with parent instance
    newLogger.logBuffer = this.logBuffer;
    newLogger.bufferSize = this.bufferSize;
    newLogger.flushTimer = this.flushTimer;
    newLogger.flushInterval = this.flushInterval;
    newLogger.lastFlushTime = this.lastFlushTime;

    return newLogger;
  }

  /**
   * Add context to current logger instance
   */
  addContext(context: Partial<LoggerContext>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Clear context
   */
  clearContext(): this {
    this.context = {};
    return this;
  }

  /**
   * Start timing
   */
  start(): this {
    this.startTime = Date.now();
    return this;
  }

  update(key: string, value: any): this {
    this.addContext({ [key]: value });
    return this;
  }

  /**
   * Log success (appResultCode starting with 2xxx or 3xxx)
   */
  // success(
  //   appResultCode: string,
  //   appResult?: string,
  //   metadata?: Record<string, any>
  // ): this {
  //   this.flush( 200, metadata);
  //   return this;
  // }

  /**
   * Log error (appResultCode starting with 4xxx or 5xxx)
   */
  // error(
  //   appResultCode: string,
  //   appResult?: string,
  //   statusCode?: number,
  //   metadata?: Record<string, any>
  // ): this {
  //   const httpStatus = statusCode || this.inferStatusCode(appResultCode);
  //   this.flush(httpStatus, metadata);
  //   return this;
  // }

  /**
   * Flush log with full control
   */
  flush(
    statusCode: number,
    data?: any
  ): this {

    this.log("info", statusCode, data);
    return this;
  }

  /**
   * Core logging method - Optimized with buffering
   */
  private log(level: string, statusCode: number, metadata?: any): void {
    // Cached timestamp for better performance
    const now = Date.now();
    const duration = this.startTime ? now - this.startTime : undefined;

    // Build log entry efficiently (avoid unnecessary spreads)
    const logEntry: LogEntry = {
      timestamp: new Date(now).toISOString(),
      type: 'summary',
      level: level.toUpperCase(),
      ...this.context,
      statusCode,
    };

    // Add optional fields
    if (duration !== undefined) {
      logEntry.duration = duration;
    }

    if (metadata) {
      Object.assign(logEntry, metadata);
    }

    // Console: immediate write
    const consoleOutput = this.consoleFormatter.formatLog(logEntry);
    this.consoleTransport.write(consoleOutput, level.toUpperCase());

    // File: buffered write
    if (SummaryLogger.config.enableFileLogging) {
      const fileOutput = this.fileFormatter.formatLog(logEntry);
      this.bufferLog(fileOutput);
    }

    // Reset timer
    this.startTime = undefined;
  }

  /**
   * Buffer log for batch file writing
   */
  private bufferLog(log: string): void {
    this.logBuffer.push(log);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush buffered logs to file
   */
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    // Batch write all buffered logs (each log already has \n from FileFormatter)
    const bufferedLogs = this.logBuffer.join('');
    this.fileTransport.write(bufferedLogs);

    // Clear buffer and update flush time
    this.logBuffer = [];
    this.lastFlushTime = Date.now();
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);

    // Don't prevent Node.js from exiting
    this.flushTimer.unref();
  }

  /**
   * Stop flush timer and flush remaining logs
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.flushBuffer();
  }

  /**
   * Auto-infer HTTP status code from appResultCode
   */
  private inferStatusCode(appResultCode: string): number {
    const code = parseInt(appResultCode);

    if (code >= 2000 && code < 3000) return 200; // Success
    if (code >= 3000 && code < 4000) return 201; // Created
    if (code >= 4000 && code < 4100) return 400; // Bad Request
    if (code >= 4100 && code < 4200) return 401; // Unauthorized
    if (code >= 4200 && code < 4300) return 403; // Forbidden
    if (code >= 4300 && code < 4400) return 404; // Not Found
    if (code >= 4400 && code < 5000) return 409; // Conflict
    if (code >= 5000) return 500; // Server Error

    return 200; // Default
  }
}
