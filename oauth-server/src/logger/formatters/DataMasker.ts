import { createHash } from 'crypto';
import { MaskingStrategy, MaskingOptionDto } from '../types';

export class DataMasker {
  /**
   * Mask sensitive data based on masking options
   */
  static mask(data: any, maskingOptions?: MaskingOptionDto[]): any {
    if (!maskingOptions || maskingOptions.length === 0) {
      return data;
    }

    // Clone data to avoid mutating original
    const clonedData = this.deepClone(data);

    for (const option of maskingOptions) {
      this.maskField(clonedData, option.field, option.strategy);
    }

    return clonedData;
  }

  /**
   * Mask a specific field using dot notation path
   */
  private static maskField(obj: any, path: string, strategy: MaskingStrategy): void {
    const keys = path.split('.');
    let current = obj;

    // Navigate to the parent of the target field
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key !== undefined && current[key] === undefined) {
        return; // Path doesn't exist
      }
      if (key !== undefined) {
        current = current[key];
      }
    }

    const lastKey = keys[keys.length - 1];
    
    if (lastKey !== undefined && current[lastKey] !== undefined) {
      current[lastKey] = this.maskValue(current[lastKey], strategy);
    }
  }

  /**
   * Mask a single value based on strategy
   */
  private static maskValue(value: any, strategy: MaskingStrategy): any {
    if (value === null || value === undefined) {
      return value;
    }

    const strValue = String(value);

    switch (strategy) {
      case MaskingStrategy.FULL:
        return '[REDACTED]';

      case MaskingStrategy.PARTIAL:
        return this.maskPartial(strValue);

      case MaskingStrategy.EMAIL:
        return this.maskEmail(strValue);

      case MaskingStrategy.HASH:
        return this.maskHash(strValue);

      case MaskingStrategy.NONE:
      default:
        return value;
    }
  }

  /**
   * Partial masking: show first 4 and last 4 characters
   * Example: "authorization_code_12345" → "auth...2345"
   */
  private static maskPartial(value: string): string {
    if (value.length <= 8) {
      return '***';
    }

    const firstPart = value.substring(0, 4);
    const lastPart = value.substring(value.length - 4);
    
    return `${firstPart}...${lastPart}`;
  }

  /**
   * Email masking: show first char, domain, hide username
   * Example: "user@example.com" → "u***r@example.com"
   */
  private static maskEmail(value: string): string {
    const emailRegex = /^([^@]+)@(.+)$/;
    const match = value.match(emailRegex);

    if (!match) {
      return this.maskPartial(value); // Not an email, use partial
    }

    const [, username, domain] = match;

    if (!username || username.length <= 2) {
      return `***@${domain}`;
    }

    const firstChar = username[0];
    const lastChar = username[username.length - 1];
    const masked = `${firstChar}***${lastChar}`;

    return `${masked}@${domain}`;
  }

  /**
   * Hash masking: show SHA-256 hash
   * Example: "password123" → "sha256:ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"
   */
  private static maskHash(value: string): string {
    const hash = createHash('sha256').update(value).digest('hex');
    return `sha256:${hash}`;
  }

  /**
   * Deep clone object to avoid mutation
   */
  private static deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof Object) {
      const clonedObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }
}
