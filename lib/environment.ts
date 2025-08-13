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
  // Use NODE_ENV directly - standard and reliable
  const nodeEnv = process.env.NODE_ENV as string
  
  if (nodeEnv === 'development') {
    return 'development'
  }
  
  if (nodeEnv === 'staging') {
    return 'staging'
  }
  
  // Default to production
  return 'production'
}

/**
 * Client-side environment detection using standard env vars
 * No more complex URL parsing!
 */
export function getClientEnvironmentMode(): EnvironmentMode {
  // In Next.js, NODE_ENV is available on client via webpack
  return getEnvironmentMode()
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