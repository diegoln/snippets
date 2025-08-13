/**
 * Simplified Environment Detection for AdvanceWeekly
 * 
 * ROBUST STAGING ARCHITECTURE:
 * - development: Local dev server (localhost:3000)
 * - staging: staging.advanceweekly.io (dedicated infrastructure)
 * - production: advanceweekly.io (production infrastructure)
 * 
 * No more URL parsing or complex detection logic!
 */

export type EnvironmentMode = 'development' | 'staging' | 'production'

/**
 * Get current environment mode using standard environment variables
 * Simple, reliable, no URL parsing needed!
 */
export function getEnvironmentMode(): EnvironmentMode {
  // Check for custom runtime environment variable first (Cloud Run sets this)
  // This avoids Next.js build-time optimization of process.env.NODE_ENV
  const runtimeEnv = process.env.RUNTIME_ENV || process.env.NODE_ENV
  
  if (runtimeEnv === 'development') {
    return 'development'
  }
  
  if (runtimeEnv === 'staging') {
    return 'staging'
  }
  
  // Default to production
  return 'production'
}

// Cache for runtime environment detection
let runtimeEnvironmentCache: EnvironmentMode | null = null
let runtimeEnvironmentPromise: Promise<EnvironmentMode> | null = null

/**
 * Client-side environment detection using runtime API
 * Falls back to build-time detection if API fails
 */
export function getClientEnvironmentMode(): EnvironmentMode {
  // Return cached value if available (synchronous)
  if (runtimeEnvironmentCache) {
    return runtimeEnvironmentCache
  }

  // Fallback to build-time detection (will be 'production' in staging)
  const buildTimeMode = process.env.ENVIRONMENT_MODE as string
  
  if (buildTimeMode === 'development') {
    return 'development'
  }
  
  if (buildTimeMode === 'staging') {
    return 'staging'
  }
  
  // Default to production
  return 'production'
}

/**
 * Async client-side environment detection using runtime API
 * This fetches the correct environment from the server with race condition prevention
 */
export async function getClientEnvironmentModeAsync(): Promise<EnvironmentMode> {
  // Return cached value if available
  if (runtimeEnvironmentCache) {
    return runtimeEnvironmentCache
  }
  
  // Return existing promise if one is already in flight
  if (runtimeEnvironmentPromise) {
    return runtimeEnvironmentPromise
  }
  
  // Create and cache the promise to prevent multiple concurrent requests
  runtimeEnvironmentPromise = (async () => {
    try {
      const response = await fetch('/api/environment', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const environment = data.environment as EnvironmentMode
        
        // Cache the result for future calls
        runtimeEnvironmentCache = environment
        
        return environment
      } else {
        console.warn('Failed to fetch runtime environment, using build-time fallback')
        return getClientEnvironmentMode()
      }
    } catch (error) {
      console.warn('Error fetching runtime environment:', error)
      return getClientEnvironmentMode()
    } finally {
      // Clear the promise so future calls can create a new one if needed
      runtimeEnvironmentPromise = null
    }
  })()
  
  return runtimeEnvironmentPromise
}

/**
 * Environment mode checks for convenience
 */
export function isDevelopment(): boolean {
  return getEnvironmentMode() === 'development'
}

export function isStaging(): boolean {
  return getEnvironmentMode() === 'staging'
}

export function isProduction(): boolean {
  return getEnvironmentMode() === 'production'
}

/**
 * Combined check for dev-like environments (development + staging)
 * Useful for enabling mock data, dev tools, etc.
 */
export function isDevLike(): boolean {
  const mode = getEnvironmentMode()
  return mode === 'development' || mode === 'staging'
}

/**
 * Check if we should use mock authentication
 * True for development and staging, false for production
 */
export function shouldUseMockAuth(): boolean {
  return isDevLike()
}

/**
 * Check if we should use mock integration data
 */
export function shouldUseMockIntegrations(): boolean {
  return isDevLike()
}

/**
 * Check if dev tools should be available
 */
export function shouldShowDevTools(): boolean {
  return isDevLike()
}

/**
 * Get the appropriate base URL for the current environment
 * Each environment has its own domain - clean and simple!
 */
export function getBaseUrl(): string {
  const mode = getEnvironmentMode()
  
  switch (mode) {
    case 'development':
      return process.env.NEXTAUTH_URL || 'http://localhost:3000'
    case 'staging':
      return 'https://staging.advanceweekly.io'
    case 'production':
    default:
      return 'https://advanceweekly.io'
  }
}

/**
 * Environment configuration for different features
 * Much simpler than before!
 */
export const ENV_CONFIG = {
  development: {
    database: 'postgresql',  // Now uses PostgreSQL in all environments
    auth: 'mock',
    integrations: 'mock',
    devTools: true
  },
  staging: {
    database: 'postgresql',
    auth: 'mock',  // Staging uses mock auth for easy testing
    integrations: 'mock',
    devTools: true
  },
  production: {
    database: 'postgresql',
    auth: 'oauth',  // Production uses real OAuth
    integrations: 'real',
    devTools: false
  }
} as const

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig() {
  const mode = getEnvironmentMode()
  return ENV_CONFIG[mode]
}

/**
 * Get environment-specific display information
 */
export function getEnvironmentInfo() {
  const mode = getEnvironmentMode()
  
  return {
    mode,
    baseUrl: getBaseUrl(),
    config: getEnvironmentConfig(),
    isDevLike: isDevLike(),
    displayName: mode.charAt(0).toUpperCase() + mode.slice(1)
  }
}