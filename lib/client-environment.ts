/**
 * Client-side environment detection utilities
 * 
 * These utilities help detect the current environment (staging, development, production)
 * from the client-side context. Used across components to provide environment-specific
 * behavior and visual indicators.
 */

/**
 * Detects if the current page is running in the staging environment
 * Checks if the current pathname starts with '/staging'
 * 
 * @returns true if in staging environment, false otherwise
 */
export function isInStagingEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  return window.location.pathname.startsWith('/staging')
}

/**
 * Detects if the current page is running in development environment
 * Checks common localhost patterns
 * 
 * @returns true if in development environment, false otherwise
 */
export function isInDevelopmentEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost')
}

/**
 * Detects if the current page is running in production environment
 * (excluding staging which runs on production infrastructure)
 * 
 * @returns true if in production (non-staging), false otherwise
 */
export function isInProductionEnvironment(): boolean {
  return !isInDevelopmentEnvironment() && !isInStagingEnvironment()
}