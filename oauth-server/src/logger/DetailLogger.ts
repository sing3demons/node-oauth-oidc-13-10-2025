import {
  LoggerContext,
  ILoggerActionData,
  MaskingOptionDto,
  LogEntry,
  LogLevel,
  ConsoleFormat,
  LoggerConfig,
} from './types';
import { DataMasker } from './formatters/DataMasker';
import { ConsoleFormatter } from './formatters/ConsoleFormatter';
import { FileFormatter } from './formatters/FileFormatter';
import { ConsoleTransport } from './transports/ConsoleTransport';
import { FileTransport } from './transports/FileTransport';

export class DetailLogger {
  private static instance: DetailLogger;
  private static config: LoggerConfig = {
    consoleFormat: ConsoleFormat.PRETTY,
    enableFileLogging: true,
    logLevel: LogLevel.INFO,
  };

  private context: LoggerContext = {};
  private consoleFormatter: ConsoleFormatter;
  private fileFormatter: FileFormatter;
  private consoleTransport: ConsoleTransport;
  private fileTransport: FileTransport;

  private constructor(logDir: string = 'logs/details', filename: string = 'detail') {
    this.consoleFormatter = new ConsoleFormatter(DetailLogger.config.consoleFormat);
    this.fileFormatter = new FileFormatter();
    this.consoleTransport = new ConsoleTransport();
    this.fileTransport = new FileTransport(logDir, filename);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DetailLogger {
    if (!DetailLogger.instance) {
      DetailLogger.instance = new DetailLogger();
    }
    return DetailLogger.instance;
  }

  /**
   * Configure logger globally
   */
  static configure(config: Partial<LoggerConfig>): void {
    DetailLogger.config = { ...DetailLogger.config, ...config };
    // Recreate instance with new config
    if (DetailLogger.instance) {
      DetailLogger.instance.consoleFormatter = new ConsoleFormatter(
        DetailLogger.config.consoleFormat
      );
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): LoggerConfig {
    return DetailLogger.config;
  }

  /**
   * Create a new logger with additional context
   */
  withContext(context: LoggerContext): DetailLogger {
    const newLogger = Object.create(DetailLogger.prototype);
    newLogger.context = { ...this.context, ...context };
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
   * Log INFO level
   */
  info(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    if (DetailLogger.config.logLevel! >= LogLevel.INFO) {
      this.log('INFO', actionData, data, maskingOptions);
    }
    return this;
  }

  /**
   * Log ERROR level (with call stack)
   */
  error(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    if (DetailLogger.config.logLevel! >= LogLevel.ERROR) {
      this.log('ERROR', actionData, data, maskingOptions, true);
    }
    return this;
  }

  /**
   * Log WARN level
   */
  warn(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    if (DetailLogger.config.logLevel! >= LogLevel.WARN) {
      this.log('WARN', actionData, data, maskingOptions);
    }
    return this;
  }

  /**
   * Log DEBUG level
   */
  debug(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    if (DetailLogger.config.logLevel! >= LogLevel.DEBUG) {
      this.log('DEBUG', actionData, data, maskingOptions);
    }
    return this;
  }

  /**
   * Core logging method
   */
  private log(
    level: string,
    actionData: ILoggerActionData,
    data?: any,
    maskingOptions?: MaskingOptionDto[],
    includeStack: boolean = false
  ): void {
    // Mask sensitive data
    const maskedData = maskingOptions ? DataMasker.mask(data, maskingOptions) : data;

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      ...this.context,
      action: actionData.action,
      description: actionData.description,
      ...(actionData.subAction && { subAction: actionData.subAction }),
      ...(maskedData && { data: JSON.stringify(maskedData) }),
    };

    // Add call stack for ERROR level
    if (includeStack && level === 'ERROR') {
      logEntry.callStack = this.getCallStack();
    }

    // Format and write to console
    const consoleOutput = this.consoleFormatter.formatLog(logEntry);
    this.consoleTransport.write(consoleOutput, level);

    // Write to file if enabled
    if (DetailLogger.config.enableFileLogging) {
      const fileOutput = this.fileFormatter.formatLog(logEntry);
      this.fileTransport.write(fileOutput);
    }
  }

  /**
   * Get call stack (top 5 frames, excluding logger internal calls)
   */
  private getCallStack(): string[] {
    const stack = new Error().stack;
    if (!stack) return [];

    const lines = stack.split('\n');
    // Skip first 3 lines (Error, getCallStack, log)
    const relevantLines = lines
      .slice(4)
      .filter((line) => !line.includes('DetailLogger'))
      .slice(0, 5)
      .map((line) => line.trim());

    return relevantLines;
  }
}
