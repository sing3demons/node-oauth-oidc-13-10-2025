import { LogEntry } from '../types';

export class FileFormatter {
  /**
   * Format log entry as single-line JSON for file output
   */
  formatLog(logEntry: LogEntry): string {
    return JSON.stringify(logEntry);
  }
}
