/**
 * Utility functions for authentication headers
 * Provides consistent auth header handling across components
 */

// Development user ID constant
export const DEV_USER_ID = 'dev-user-123'

/**
 * Get authentication headers for API requests
 * Returns development headers in dev environment, empty in production
 */
export function getAuthHeaders(): Record<string, string> {
  return process.env.NODE_ENV === 'development' 
    ? { 'X-Dev-User-Id': DEV_USER_ID }
    : {}
}

/**
 * Get authentication headers with additional headers
 * Merges auth headers with provided headers
 */
export function getAuthHeadersWith(additionalHeaders: Record<string, string>): Record<string, string> {
  return {
    ...additionalHeaders,
    ...getAuthHeaders()
  }
}