import { DetailLogger } from './DetailLogger.js';
import type { Request } from 'express';
import { v7 as uuidv7 } from 'uuid';
import { SummaryLogger } from './SummaryLogger.js';
import {
  LoggerContext,
  ILoggerActionData,
  MaskingOptionDto,
  LoggerConfig,
  LoggerAction,
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
  init(cmd: string): this;
  success(appResultCode: string, appResult?: string, metadata?: Record<string, any>): this;
  flush(appResultCode: string, appResult?: string, statusCode?: number, metadata?: Record<string, any>): this;

  update(key: string, value: any): this
  addSummaryMetadata(key: string, value: any): this
  end(statusCode?: number): void
  getOutboundMaskingOptions(): MaskingOptionDto[]
  // Context management
  // withContext(context: LoggerContext): ILogger;
  // addContext(context: Partial<LoggerContext>): this;
  clearContext(): this;
  autoOutbound(): boolean
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
  private detail: DetailLogger = DetailLogger.getInstance();
  private summary: SummaryLogger = SummaryLogger.getInstance();

  private readonly context: LoggerContext = {};
  private readonly inbound: Record<string, unknown> = {};

  constructor(additionalContext: LoggerContext, req?: Request) {
    if (req) {
      this.inbound = {
        method: req.method,
        url: req.url,
        headers: req?.headers || {},
        query: req?.query || {},
        body: req?.body || {},
        params: req?.params || {},
      }
    }
    additionalContext.requestId = uuidv7();
    const context = { ...additionalContext };
    this.context = context;
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
  end(statusCode?: number) {
    this.summary.flush(statusCode || 200);
  }

  // ============================================
  // SummaryLogger methods
  // ============================================

  /**
   * Start timing (SummaryLogger)
   */
  private readonly outboundMaskingOptions: MaskingOptionDto[] = [];
  public getOutboundMaskingOptions(): MaskingOptionDto[] {
    return this.outboundMaskingOptions;
  }

  private _autoOutbound = false
  public autoOutbound(): boolean {
    return this._autoOutbound
  }
  init(cmd: string, inboundMaskingOptions?: MaskingOptionDto[], outboundMaskingOptions?: MaskingOptionDto[]): this {
    this.context.module = cmd;
    this.detail = DetailLogger.getInstance().withContext(this.context);
    this.summary = SummaryLogger.getInstance().withContext(this.context);
    this.summary.start();

    this.detail.info(LoggerAction.INBOUND(`Start ${cmd}`), this.inbound, inboundMaskingOptions);
    this._autoOutbound = true;
    if (outboundMaskingOptions) {
      this.outboundMaskingOptions.push(...outboundMaskingOptions);
    }
    return this;
  }

  public update(key: string, value: any): this {
    this.detail = this.detail.addContext({ [key]: value });
    this.summary = this.summary.addContext({ [key]: value });
    return this;
  }

  private summaryMetadata = new Map<string, any>();
  public addSummaryMetadata(key: string, value: any): this {
    // check if key exists, if so, merge
    if (this.summaryMetadata.has(key)) {
      const existing = this.summaryMetadata.get(key);
      if (typeof existing === 'object' && typeof value === 'object') {
        // array
        if (Array.isArray(existing) && Array.isArray(value)) {
          this.summaryMetadata.set(key, [...existing, ...value]);
          return this;
        }
        // object
        this.summaryMetadata.set(key, { ...existing, ...value });
        return this;
      }
      this.summaryMetadata.set(key, value);
    }
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
    if (this.summaryMetadata.size > 0) {
      this.summary.addContext({
        ...Object.fromEntries(this.summaryMetadata),
      })
    }
    // this.summary.success(appResultCode, appResult, metadata);
    this.summaryMetadata.clear();
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
    // merge metadata with summaryMetadata
    if (this.summaryMetadata.size > 0) {
      this.summary.addContext({
        ...Object.fromEntries(this.summaryMetadata),
      })
    }
    if (appResultCode) {
      this.summary.update('appResultCode', appResultCode);
    }
    if (appResult) {
      this.summary.update('appResult', appResult);
    }
    if (statusCode) {
      this.summary.update('statusCode', statusCode);
    }
    if (metadata) {
      this.summary.update('metadata', metadata);
    }
    // this.summary.flush(appResultCode, appResult, statusCode, metadata);
    this.summaryMetadata.clear();
    return this;
  }

  // ============================================
  // Context management
  // ============================================



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
