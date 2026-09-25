import { timingSafeEqual } from 'crypto';

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  status?: number;
  error?: string;
}

/**
 * Validate a write operation API key using constant-time comparison
 * 
 * Reads FASTENER_WRITE_KEY from environment. Fails closed: if the key is
 * unset or empty, returns 503. If the provided key is missing or wrong,
 * returns 401.
 * 
 * Accepts keys via:
 * - x-api-key header
 * - Authorization: Bearer <key> header
 * 
 * @param headers - Request headers
 * @returns Authentication result with status and error if not authenticated
 */
export function validateWriteKey(headers: Headers): AuthResult {
  const configuredKey = process.env.FASTENER_WRITE_KEY;

  // Fail closed: key not configured
  if (!configuredKey || configuredKey.trim().length === 0) {
    return {
      authenticated: false,
      status: 503,
      error: 'Write operations not available: FASTENER_WRITE_KEY not configured',
    };
  }

  // Extract key from headers
  const xApiKey = headers.get('x-api-key');
  const authHeader = headers.get('authorization');
  
  let providedKey: string | null = null;
  
  if (xApiKey) {
    providedKey = xApiKey;
  } else if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    providedKey = authHeader.slice(7); // Remove 'Bearer ' prefix
  }

  // Missing key
  if (!providedKey || providedKey.trim().length === 0) {
    return {
      authenticated: false,
      status: 401,
      error: 'Unauthorized: Missing API key (send via x-api-key or Authorization: Bearer header)',
    };
  }

  // Constant-time comparison to prevent timing attacks
  // Normalize lengths to prevent length-based timing leaks
  const configuredBuffer = Buffer.from(configuredKey, 'utf8');
  const providedBuffer = Buffer.from(providedKey, 'utf8');

  // If lengths differ, compare against a dummy buffer of the configured length
  // to maintain constant time
  const lengthMatch = configuredBuffer.length === providedBuffer.length;
  const comparisonBuffer = lengthMatch 
    ? providedBuffer 
    : Buffer.alloc(configuredBuffer.length);

  let keysMatch = false;
  try {
    keysMatch = timingSafeEqual(configuredBuffer, comparisonBuffer);
  } catch {
    // timingSafeEqual throws if lengths differ (shouldn't happen with our logic)
    keysMatch = false;
  }

  // Only mark as authenticated if both length and content match
  const authenticated = lengthMatch && keysMatch;

  if (!authenticated) {
    return {
      authenticated: false,
      status: 401,
      error: 'Unauthorized: Invalid API key',
    };
  }

  return {
    authenticated: true,
  };
}
