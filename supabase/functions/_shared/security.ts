// Security utilities for Edge Functions

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export class SecurityError extends Error {
  constructor(message: string, public code: string = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
  }
}

// Rate limiting store (in-memory for now)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean => {
  const now = Date.now();
  const key = `${identifier}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
};

export const validateInput = (data: any, schema: ValidationSchema): void => {
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];
    
    // Required field check
    if (rule.required && (value === undefined || value === null)) {
      throw new SecurityError(`Field '${field}' is required`, 'VALIDATION_ERROR');
    }
    
    // Skip validation for optional empty fields
    if (value === undefined || value === null) continue;
    
    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        throw new SecurityError(
          `Field '${field}' must be of type ${rule.type}, got ${actualType}`,
          'VALIDATION_ERROR'
        );
      }
    }
    
    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        throw new SecurityError(
          `Field '${field}' must be at least ${rule.minLength} characters`,
          'VALIDATION_ERROR'
        );
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        throw new SecurityError(
          `Field '${field}' cannot exceed ${rule.maxLength} characters`,
          'VALIDATION_ERROR'
        );
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        throw new SecurityError(
          `Field '${field}' format is invalid`,
          'VALIDATION_ERROR'
        );
      }
      if (rule.enum && !rule.enum.includes(value)) {
        throw new SecurityError(
          `Field '${field}' must be one of: ${rule.enum.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }
    }
    
    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        throw new SecurityError(
          `Field '${field}' must be at least ${rule.min}`,
          'VALIDATION_ERROR'
        );
      }
      if (rule.max !== undefined && value > rule.max) {
        throw new SecurityError(
          `Field '${field}' cannot exceed ${rule.max}`,
          'VALIDATION_ERROR'
        );
      }
    }
  }
};

export const sanitizeString = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potential XSS vectors
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .substring(0, maxLength)
    .trim();
};

export const logSecurityEvent = async (
  supabase: any,
  userId: string | null,
  action: string,
  details: any,
  request?: Request
): Promise<void> => {
  try {
    const userAgent = request?.headers.get('user-agent') || 'Unknown';
    const xForwardedFor = request?.headers.get('x-forwarded-for');
    const cfConnectingIp = request?.headers.get('cf-connecting-ip');
    const ipAddress = xForwardedFor || cfConnectingIp || 'Unknown';
    
    await supabase.from('security_audit_logs').insert({
      user_id: userId,
      action,
      details: typeof details === 'object' ? details : { message: details },
      ip_address: ipAddress,
      user_agent: userAgent,
      success: !details.error,
      error_message: details.error || null
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Security headers for responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
};