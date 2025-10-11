export class ConsoleTransport {
  /**
   * Write log to console (stdout for info/debug, stderr for warn/error)
   */
  write(formattedLog: string, level: string): void {
    if (level === 'ERROR' || level === 'WARN') {
      process.stderr.write(formattedLog + '\n');
    } else {
      process.stdout.write(formattedLog + '\n');
    }
  }
}
