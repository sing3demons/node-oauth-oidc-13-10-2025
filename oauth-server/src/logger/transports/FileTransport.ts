import * as fs from 'fs';
import * as path from 'path';

export class FileTransport {
  private logDir: string;
  private filename: string;
  private currentDate: string;
  private fileHandle: fs.WriteStream | null = null;

  constructor(enableFileLogging: boolean, logDir: string = 'logs', filename: string = 'application') {
    this.logDir = logDir;
    this.filename = filename;
    this.currentDate = this.getDateString();
    if (enableFileLogging) {
      this.ensureLogDir();
    }
  }

  /**
   * Write log to file with daily rotation
   */
  write(formattedLog: string): void {
    const today = this.getDateString();

    // Rotate file if date changed
    if (today !== this.currentDate) {
      this.closeFile();
      this.currentDate = today;
    }

    // Get or create file stream
    // formattedLog already has \n from FileFormatter
    const stream = this.getFileStream();
    stream.write(formattedLog);
  }

  /**
   * Get or create file write stream
   */
  private getFileStream(): fs.WriteStream {
    if (!this.fileHandle || this.fileHandle.destroyed) {
      const filePath = this.getLogFilePath();
      this.fileHandle = fs.createWriteStream(filePath, { flags: 'a' });
    }
    return this.fileHandle;
  }

  /**
   * Get log file path with date
   */
  private getLogFilePath(): string {
    return path.join(this.logDir, `${this.filename}-${this.currentDate}.log`);
  }

  /**
   * Get current date string (YYYY-MM-DD)
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Close file stream
   */
  private closeFile(): void {
    if (this.fileHandle && !this.fileHandle.destroyed) {
      this.fileHandle.end();
      this.fileHandle = null;
    }
  }

  /**
   * Clean up on process exit
   */
  destroy(): void {
    this.closeFile();
  }
}
