import { DetailLogger } from './DetailLogger.js';
import { SummaryLogger } from './SummaryLogger.js';
import {
  LoggerContext,
  ILoggerActionData,
  MaskingOptionDto,
  LoggerConfig,
} from './types.js';

/**
 * Interface for Logger - Defines logging methods and context management
 */
export interface ILogger {
  // DetailLogger methods
  info(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this;
  error(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this;
  warn(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this;
  debug(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this;

  // SummaryLogger methods
  start(): this;
  success(appResultCode: string, appResult?: string, metadata?: Record<string, any>): this;
  flush(appResultCode: string, appResult?: string, statusCode?: number, metadata?: Record<string, any>): this;

  // Context management
  withContext(context: LoggerContext): ILogger;
  addContext(context: Partial<LoggerContext>): this;
  clearContext(): this;
}

/**
 * Unified Logger - Combines DetailLogger and SummaryLogger
 * 
 * Usage:
 * ```typescript
 * const logger = new Logger("ModuleName");
 * logger.info(LoggerAction.HTTP_REQUEST("Token request"), { grant_type: "..." });
 * logger.flush("2000", "Success");
 * ```
 */
export class Logger implements ILogger {
  private detail: DetailLogger;
  private summary: SummaryLogger;

  constructor(moduleName: string, additionalContext?: LoggerContext) {
    const context = { module: moduleName, ...additionalContext };
    this.detail = DetailLogger.getInstance().withContext(context);
    this.summary = SummaryLogger.getInstance().withContext(context);
  }

  /**
   * Configure both loggers globally
   */
  static configure(config: Partial<LoggerConfig>): void {
    DetailLogger.configure(config);
    SummaryLogger.configure(config);
  }

  /**
   * Get current configuration
   */
  static getConfig(): { detail: LoggerConfig; summary: LoggerConfig } {
    return {
      detail: DetailLogger.getConfig(),
      summary: SummaryLogger.getConfig(),
    };
  }

  // ============================================
  // DetailLogger methods
  // ============================================

  /**
   * Log INFO level (DetailLogger)
   */
  info(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    this.detail.info(actionData, data, maskingOptions);
    return this;
  }

  /**
   * Log ERROR level with call stack (DetailLogger)
   */
  error(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    this.detail.error(actionData, data, maskingOptions);
    return this;
  }

  /**
   * Log WARN level (DetailLogger)
   */
  warn(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    this.detail.warn(actionData, data, maskingOptions);
    return this;
  }

  /**
   * Log DEBUG level (DetailLogger)
   */
  debug(actionData: ILoggerActionData, data?: any, maskingOptions?: MaskingOptionDto[]): this {
    this.detail.debug(actionData, data, maskingOptions);
    return this;
  }

  // ============================================
  // SummaryLogger methods
  // ============================================

  /**
   * Start timing (SummaryLogger)
   */
  start(): this {
    this.summary.start();
    return this;
  }

  /**
   * Log success (SummaryLogger)
   */
  success(
    appResultCode: string,
    appResult?: string,
    metadata?: Record<string, any>
  ): this {
    this.summary.success(appResultCode, appResult, metadata);
    return this;
  }

  /**
   * Flush summary log with custom status code (SummaryLogger)
   */
  flush(
    appResultCode: string,
    appResult?: string,
    statusCode?: number,
    metadata?: Record<string, any>
  ): this {
    this.summary.flush(appResultCode, appResult, statusCode, metadata);
    return this;
  }

  // ============================================
  // Context management
  // ============================================

  /**
   * Create a new logger with additional context
   */
  withContext(context: LoggerContext): ILogger {
    const newLogger = new Logger('');
    newLogger.detail = this.detail.withContext(context);
    newLogger.summary = this.summary.withContext(context);
    return newLogger;
  }

  /**
   * Add context to current logger
   */
  addContext(context: Partial<LoggerContext>): this {
    this.detail.addContext(context);
    this.summary.addContext(context);
    return this;
  }

  /**
   * Clear context
   */
  clearContext(): this {
    this.detail.clearContext();
    this.summary.clearContext();
    return this;
  }
}
