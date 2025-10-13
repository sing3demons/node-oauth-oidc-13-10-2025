import { LogEntry } from '../types';

export class FileFormatter {
  /**
   * Format log entry as single-line JSON for file output
   * Always ends with newline for proper file formatting
   */
  formatLog(logEntry: LogEntry): string {
    return JSON.stringify(logEntry) + '\n';
  }
}
