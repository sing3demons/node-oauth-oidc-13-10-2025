/**
 * Logger - Unified logging system for OAuth2 server
 * 
 * Features:
 * - DetailLogger: Development logging with data masking
 * - SummaryLogger: Production logging with result codes
 * - Configurable console format (PRETTY/JSON)
 * - Daily log file rotation
 * - Auto-detect TTY for colors
 * 
 * @example
 * ```typescript
 * import { Logger, LoggerAction, SubActionEnum, MaskingStrategy } from './utils/logger';
 * 
 * const logger = new Logger("OAuthTokenEndpoint");
 * 
 * logger.start().info(
 *   LoggerAction.HTTP_REQUEST("Token request", SubActionEnum.READ),
 *   { grant_type: "authorization_code", code: "secret" },
 *   [{ field: 'code', strategy: MaskingStrategy.PARTIAL }]
 * );
 * 
 * logger.flush("2000", "Token issued successfully");
 * ```
 */

// Main API
export { Logger } from './Logger';
export type { ILogger } from './Logger';

// Helper class
export { LoggerAction } from './types';

// Types and Interfaces
export type {
  LoggerContext,
  ILoggerActionData,
  MaskingOptionDto,
  LoggerConfig,
  LogEntry,
  SummaryLogData,
} from './types';

// Enums
export {
  LoggerActionEnum,
  SubActionEnum,
  MaskingStrategy,
  LogLevel,
  ConsoleFormat,
} from './types';

// Internal classes (for advanced usage)
export { DetailLogger } from './DetailLogger';
export { SummaryLogger } from './SummaryLogger';