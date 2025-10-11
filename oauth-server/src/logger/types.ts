// Logger Context
export interface LoggerContext {
  service?: string;        // Service name (from config)
  version?: string;        // Service version (from config)
  environment?: string;    // Environment (from config)
  module?: string;         // Module name (e.g., "TokenHandler")
  component?: string;      // Component name (e.g., "MongoDBClient")
  traceId?: string;        // Request trace ID
  sessionId?: string;      // User session ID
}

// Logger Action Data
export interface ILoggerActionData {
  action: LoggerActionEnum;
  description: string;
  subAction?: SubActionEnum | string;
}

// Logger Action Enum
export enum LoggerActionEnum {
  CONSUMING = "CONSUMING",
  PRODUCING = "PRODUCING",
  APP_LOGIC = "APP_LOGIC",
  HTTP_REQUEST = "HTTP_REQUEST",
  HTTP_RESPONSE = "HTTP_RESPONSE",
  DB_REQUEST = "DB_REQUEST",
  DB_RESPONSE = "DB_RESPONSE",
  EXCEPTION = "EXCEPTION",
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  SYSTEM = "SYSTEM",
  PRODUCED = "PRODUCED",
}

// Sub Action Enum
export enum SubActionEnum {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

// Masking Strategy
export enum MaskingStrategy {
  FULL = "full",        // → [REDACTED]
  PARTIAL = "partial",  // → abc1...xyz9
  EMAIL = "email",      // → u***r@example.com
  HASH = "hash",        // → sha256:a1b2c3d4e5f6g7h8
  NONE = "none",        // → original value
}

// Masking Option
export interface MaskingOptionDto {
  field: string;               // Field path (supports dot notation: "user.profile.email")
  strategy: MaskingStrategy;
}

// Log Level
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Console Format
export enum ConsoleFormat {
  PRETTY = "pretty",    // Pretty format with separators (human-readable)
  JSON = "json",        // Single-line JSON (machine-readable)
}

// Logger Configuration
export interface LoggerConfig {
  consoleFormat?: ConsoleFormat;
  enableFileLogging?: boolean;
  logLevel?: LogLevel;
}

// Summary Log Data
export interface SummaryLogData {
  appResultCode: string;        // Application result code ("2000", "4001")
  appResult?: string;           // Optional description
  statusCode?: number;          // HTTP status code (auto-inferred if not provided)
  duration?: number;            // Execution duration in milliseconds
  metadata?: Record<string, any>;
}

// Log Entry (for transports)
export interface LogEntry {
  timestamp: string;            // ISO 8601 timestamp
  level: string;                // "INFO", "WARN", "ERROR", "DEBUG"
  service?: string;
  version?: string;
  environment?: string;
  module?: string;
  component?: string;
  traceId?: string;
  sessionId?: string;
  action?: string;
  description?: string;
  subAction?: string;
  data?: string;                // JSON string
  callStack?: string[];         // Only for ERROR level
  statusCode?: number;
  appResultCode?: string;
  appResult?: string;
  duration?: number;
  metadata?: string;            // JSON string
}

// Helper Class for creating LoggerActionData
export class LoggerAction {
  private static create(
    action: LoggerActionEnum,
    description: string,
    subAction?: SubActionEnum | string
  ): ILoggerActionData {
    return {
      action,
      description,
      ...(subAction && { subAction }),
    };
  }

  static CONSUMING(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.CONSUMING, description, subAction);
  }

  static PRODUCING(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.PRODUCING, description, subAction);
  }

  static INBOUND(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.INBOUND, description, subAction);
  }

  static OUTBOUND(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.OUTBOUND, description, subAction);
  }

  static APP_LOGIC(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.APP_LOGIC, description, subAction);
  }

  static HTTP_REQUEST(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.HTTP_REQUEST, description, subAction);
  }

  static HTTP_RESPONSE(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.HTTP_RESPONSE, description, subAction);
  }

  static DB_REQUEST(description: string, subAction: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.DB_REQUEST, description, subAction);
  }

  static DB_RESPONSE(description: string, subAction: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.DB_RESPONSE, description, subAction);
  }

  static EXCEPTION(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.EXCEPTION, description, subAction);
  }

  static SYSTEM(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.SYSTEM, description, subAction);
  }

  static PRODUCED(description: string, subAction?: SubActionEnum | string): ILoggerActionData {
    return this.create(LoggerActionEnum.PRODUCED, description, subAction);
  }
}
