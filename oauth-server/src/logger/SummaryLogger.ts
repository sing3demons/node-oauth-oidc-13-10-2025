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

export class SummaryLogger {
  private static instance: SummaryLogger;
  private static config: LoggerConfig = {
    consoleFormat: ConsoleFormat.JSON, // Summary ใช้ JSON by default
    enableFileLogging: true,
    logLevel: LogLevel.INFO,
  };

  private context: LoggerContext = {};
  private startTime?: number;
  private consoleFormatter: ConsoleFormatter;
  private fileFormatter: FileFormatter;
  private consoleTransport: ConsoleTransport;
  private fileTransport: FileTransport;

  private constructor() {
    this.consoleFormatter = new ConsoleFormatter(SummaryLogger.config.consoleFormat);
    this.fileFormatter = new FileFormatter();
    this.consoleTransport = new ConsoleTransport();
    this.fileTransport = new FileTransport('logs', 'summary');
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
    if (SummaryLogger.instance) {
      SummaryLogger.instance.consoleFormatter = new ConsoleFormatter(
        SummaryLogger.config.consoleFormat
      );
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
   * Core logging method
   */
  private log(
    level: string,
    statusCode: number,
    metadata?: any
  ): void {
    const duration = this.startTime ? Date.now() - this.startTime : undefined;

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      duration: duration,
      ...this.context,
      statusCode,
      ...(metadata && { ...metadata }),
    };

    // Format and write to console
    const consoleOutput = this.consoleFormatter.formatLog(logEntry);
    this.consoleTransport.write(consoleOutput, level.toUpperCase());

    // Write to file if enabled
    if (SummaryLogger.config.enableFileLogging) {
      const fileOutput = this.fileFormatter.formatLog(logEntry);
      this.fileTransport.write(fileOutput);
    }

    // Reset start time after flush
    this.startTime = undefined as any;
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
