/**
 * Environment Detection Utilities for AdvanceWeekly
 * 
 * Provides consistent environment detection across client and server components
 * Supports three environment modes:
 * - development: Local dev server (SQLite + mocks)  
 * - staging: Production infrastructure with dev features (Cloud SQL + mocks)
 * - production: Full production (Cloud SQL + real integrations)
 */

export type EnvironmentMode = 'development' | 'staging' | 'production'

/**
 * Get current environment mode on the server side
 * Uses middleware-set header when available, falls back to detection logic
 */
export function getEnvironmentMode(): EnvironmentMode {
  // Server-side: Check if we're in development
  if (process.env.NODE_ENV === 'development') {
    return 'development'
  }
  
  // For server-side code that can access headers
  if (typeof window === 'undefined') {
    try {
      // Dynamic import to avoid client-side issues
      const { headers } = require('next/headers')
      const headersList = headers()
      const envMode = headersList.get('x-environment-mode') as EnvironmentMode
      if (envMode && ['development', 'staging', 'production'].includes(envMode)) {
        return envMode
      }
    } catch (error) {
      // Headers not available (e.g., in API routes or build time), fall back
    }
  }
  
  // Default to production for server-side when headers unavailable
  return 'production'
}

/**
 * Get current environment mode on the client side
 * Uses URL path detection and query parameters since headers aren't available
 */
export function getClientEnvironmentMode(): EnvironmentMode {
  if (typeof window === 'undefined') {
    // Server-side, use server function
    return getEnvironmentMode()
  }
  
  // Client-side path detection
  if (window.location.pathname.startsWith('/staging')) {
    return 'staging'
  }
  
  // Check if we're on mock-signin page with staging callback
  if (window.location.pathname === '/mock-signin') {
    const urlParams = new URLSearchParams(window.location.search)
    const callbackUrl = urlParams.get('callbackUrl')
    if (callbackUrl && (callbackUrl.includes('/staging') || callbackUrl === '/staging')) {
      return 'staging'
    }
  }
  
  // Check URL hash or origin for staging context  
  if (window.location.href.includes('/staging') || 
      (window.location.hash && window.location.hash.includes('staging'))) {
    return 'staging'
  }
  
  // In development, NODE_ENV should be available on client via Next.js
  if (process.env.NODE_ENV === 'development') {
    return 'development'
  }
  
  return 'production'
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
 * Useful for enabling dev features, mock data, etc.
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
 * True for development and staging, false for production
 */
export function shouldUseMockIntegrations(): boolean {
  return isDevLike()
}

/**
 * Check if dev tools should be available
 * True for development and staging, false for production  
 */
export function shouldShowDevTools(): boolean {
  return isDevLike()
}

/**
 * Get the appropriate base URL for the current environment
 */
export function getBaseUrl(): string {
  const mode = getEnvironmentMode()
  
  switch (mode) {
    case 'development':
      return process.env.NEXTAUTH_URL || 'http://localhost:3000'
    case 'staging':
      return 'https://advanceweekly.io/staging'
    case 'production':
    default:
      return 'https://advanceweekly.io'
  }
}

/**
 * Get environment-specific user ID prefix for database isolation
 * Staging users get 'staging_' prefix to separate from production data
 */
export function getUserIdPrefix(): string {
  return isStaging() ? 'staging_' : ''
}

/**
 * Generate environment-specific user ID
 */
export function generateUserId(baseId: string): string {
  return `${getUserIdPrefix()}${baseId}`
}

/**
 * Environment configuration for different features
 */
export const ENV_CONFIG = {
  development: {
    database: 'sqlite',
    auth: 'mock',
    integrations: 'mock',
    devTools: true,
    userIdPrefix: ''
  },
  staging: {
    database: 'postgresql',
    auth: 'mock', 
    integrations: 'mock',
    devTools: true,
    userIdPrefix: 'staging_'
  },
  production: {
    database: 'postgresql',
    auth: 'oauth',
    integrations: 'real',
    devTools: false,
    userIdPrefix: ''
  }
} as const

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig() {
  const mode = getEnvironmentMode()
  return ENV_CONFIG[mode]
}