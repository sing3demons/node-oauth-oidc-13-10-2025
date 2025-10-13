import { LogEntry, ConsoleFormat } from '../types';

export class ConsoleFormatter {
  private format: ConsoleFormat;
  private useColors: boolean;
  private chalk: any;

  constructor(format: ConsoleFormat = ConsoleFormat.PRETTY, useColors: boolean = true) {
    this.format = format;
    // Auto-detect: only use colors if stdout is a TTY
    this.useColors = useColors && process.stdout.isTTY;

    // Dynamically import chalk only if needed
    if (this.useColors && this.format === ConsoleFormat.PRETTY) {
      try {
        this.chalk = require('chalk');
      } catch (error) {
        // Chalk not installed, fallback to plain text
        this.useColors = false;
      }
    }
  }

  /**
   * Format log entry for console output
   */
  formatLog(logEntry: LogEntry): string {
    if (this.format === ConsoleFormat.JSON) {
      return this.formatJson(logEntry);
    }
    return this.formatPretty(logEntry);
  }

  /**
   * JSON format (single-line)
   */
  private formatJson(logEntry: LogEntry): string {
    return JSON.stringify(logEntry);
  }

  /**
   * Pretty format with optional colors
   */
  private formatPretty(logEntry: LogEntry): string {
    if (this.useColors && this.chalk) {
      return this.formatWithColors(logEntry);
    }
    return this.formatPlainText(logEntry);
  }

  /**
   * Pretty format with colors (using chalk)
   */
  private formatWithColors(logEntry: LogEntry): string {
    const c = this.chalk;
    const { timestamp, level, action, description, subAction, message, callStack, statusCode, appResultCode, appResult, duration } = logEntry;

    // Level colors
    const levelColors: Record<string, any> = {
      ERROR: c.red.bold,
      WARN: c.yellow.bold,
      INFO: c.green.bold,
      DEBUG: c.blue.bold,
    };

    const levelColor = levelColors[level] || c.white;

    let output = '\n';
    
    // For Summary logs (has appResultCode)
    if (appResultCode) {
      output += levelColor(`[${timestamp}] ${level}`) + c.gray(' | ') + c.cyan(`${statusCode} | ${appResultCode}`) + '\n';
      output += c.gray('━'.repeat(70)) + '\n';
      output += c.blue('📊 Status Code:  ') + c.cyan(statusCode) + '\n';
      output += c.blue('📋 Result Code:  ') + c.cyan(appResultCode) + '\n';
      if (appResult) {
        output += c.gray('📝 Result:       ') + appResult + '\n';
      }
      if (duration !== undefined) {
        output += c.magenta('⏱️  Duration:     ') + c.yellow(`${duration}ms`) + '\n';
      }
    }
    // For Detail logs (has action)
    else {
      output += levelColor(`[${timestamp}] ${level}`) + c.gray(' | ') + c.cyan(action || '') + '\n';
      output += c.gray('━'.repeat(70)) + '\n';
      output += c.blue('📌 Action:       ') + c.cyan(action || 'N/A') + '\n';
      output += c.gray('📝 Description:  ') + (description || 'N/A') + '\n';

      if (subAction) {
        output += c.magenta('🔹 SubAction:    ') + subAction + '\n';
      }
    }

    if (message) {
      output += c.gray('━'.repeat(70)) + '\n';
      output += c.yellow('📦 Data:         ') + this.formatData(message) + '\n';
    }

    if (callStack && callStack.length > 0) {
      output += c.gray('━'.repeat(70)) + '\n';
      output += c.red('📚 Call Stack:\n');
      callStack.forEach((frame, index) => {
        output += c.gray(`   ${index + 1}. `) + c.red(frame) + '\n';
      });
    }

    output += c.gray('━'.repeat(70));

    return output;
  }

  /**
   * Pretty format without colors (plain text)
   */
  private formatPlainText(logEntry: LogEntry): string {
    const { timestamp, level, action, description, subAction, message, callStack, statusCode, appResultCode, appResult, duration } = logEntry;

    let output = '\n';
    
    // For Summary logs (has appResultCode)
    if (appResultCode) {
      output += `[${timestamp}] ${level} | ${statusCode} | ${appResultCode}\n`;
      output += '━'.repeat(70) + '\n';
      output += `📊 Status Code:  ${statusCode}\n`;
      output += `📋 Result Code:  ${appResultCode}\n`;
      if (appResult) {
        output += `📝 Result:       ${appResult}\n`;
      }
      if (duration !== undefined) {
        output += `⏱️  Duration:     ${duration}ms\n`;
      }
    }
    // For Detail logs (has action)
    else {
      output += `[${timestamp}] ${level} | ${action || ''}\n`;
      output += '━'.repeat(70) + '\n';
      output += `📌 Action:       ${action || 'N/A'}\n`;
      output += `📝 Description:  ${description || 'N/A'}\n`;

      if (subAction) {
        output += `🔹 SubAction:    ${subAction}\n`;
      }
    }

    if (message) {
      output += '━'.repeat(70) + '\n';
      output += `📦 Data:         ${this.formatData(message)}\n`;
    }

    if (callStack && callStack.length > 0) {
      output += '━'.repeat(70) + '\n';
      output += '📚 Call Stack:\n';
      callStack.forEach((frame, index) => {
        output += `   ${index + 1}. ${frame}\n`;
      });
    }

    output += '━'.repeat(70);

    return output;
  }

  /**
   * Format data object for display
   */
  private formatData(data: string): string {
    try {
      const parsed = JSON.parse(data);
      // Pretty print if object is small
      if (JSON.stringify(parsed).length < 200) {
        return JSON.stringify(parsed, null, 2);
      }
      return data;
    } catch {
      return data;
    }
  }
}
