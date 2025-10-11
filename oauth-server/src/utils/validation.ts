import { z, ZodError } from 'zod';

/**
 * Validation result type with standardized response format
 * Uses discriminated union for proper type narrowing
 */
export type ValidationResult<T> =
  | {
      success: true;
      desc: string;
      data: T;
    }
  | {
      success: false;
      desc: string;
      data: Array<{ field: string; message: string }>;
    };

/**
 * Validate data against a Zod schema
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result with success status, description, and data or errors
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      desc: 'success',
      data: validated,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((err) => ({
        field: err.path.join('.') || 'unknown',
        message: err.message,
      }));
      
      // Create descriptive error message
      const missingFields = errors.filter(err => 
        err.message.toLowerCase().includes('required') || 
        err.message.toLowerCase().includes('expected')
      );
      const invalidFields = errors.filter(err => 
        !err.message.toLowerCase().includes('required') && 
        !err.message.toLowerCase().includes('expected')
      );
      
      let desc = 'invalid';
      if (missingFields.length > 0 && invalidFields.length > 0) {
        desc = `invalid=${invalidFields.map(e => e.field).join(',')}, missing=${missingFields.map(e => e.field).join(',')}`;
      } else if (invalidFields.length > 0) {
        desc = `invalid=${invalidFields.map(e => e.field).join(',')}`;
      } else if (missingFields.length > 0) {
        desc = `missing=${missingFields.map(e => e.field).join(',')}`;
      }
      
      return {
        success: false,
        desc,
        data: errors,
      };
    }
    return {
      success: false,
      desc: 'invalid',
      data: [
        {
          field: 'unknown',
          message: 'Validation failed',
        },
      ],
    };
  }
}

/**
 * Safe parse with typed result
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Safe parse result from Zod
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}

/**
 * Format Zod errors into a user-friendly format compatible with API response
 * @param error ZodError instance
 * @returns Formatted error details
 */
export function formatZodError(error: ZodError): {
  error: string;
  error_description: string;
  details: Array<{ field: string; message: string }>;
} {
  const errors = error.issues.map((err) => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
  }));

  return {
    error: 'invalid_request',
    error_description: errors[0]?.message || 'Validation failed',
    details: errors,
  };
}

/**
 * Format Zod errors for response helper
 * @param error ZodError instance
 * @returns Array of validation errors
 */
export function getValidationErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((err) => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
  }));
}
