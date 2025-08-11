/**
 * API Environment Detection Utilities
 * 
 * Specialized environment detection for API routes where Next.js headers()
 * may not be available or may behave differently than in page components.
 */

import { NextRequest } from 'next/server'

export type EnvironmentMode = 'development' | 'staging' | 'production'

/**
 * Detect environment mode for API routes with multiple fallback methods
 * This is more robust than the general environment detection for API contexts
 */
export function getApiEnvironmentMode(request: NextRequest): EnvironmentMode {
  // Development check first
  if (process.env.NODE_ENV === 'development') {
    return 'development'
  }
  
  // Method 1: Check URL pathname
  if (request.nextUrl.pathname.startsWith('/staging') || 
      request.nextUrl.pathname.startsWith('/api/staging')) {
    return 'staging'
  }
  
  // Method 2: Check custom header set by middleware
  const envHeader = request.headers.get('x-environment-mode') as EnvironmentMode
  if (envHeader && ['development', 'staging', 'production'].includes(envHeader)) {
    return envHeader
  }
  
  // Method 3: Check referrer for staging context
  const referrer = request.headers.get('referer') || ''
  if (referrer.includes('/staging')) {
    return 'staging'
  }
  
  // Default to production for API routes
  return 'production'
}

/**
 * Check if API request is in staging environment
 */
export function isApiStaging(request: NextRequest): boolean {
  return getApiEnvironmentMode(request) === 'staging'
}

/**
 * Check if API request is in development environment  
 */
export function isApiDevelopment(request: NextRequest): boolean {
  return getApiEnvironmentMode(request) === 'development'
}

/**
 * Check if API request is in production environment
 */
export function isApiProduction(request: NextRequest): boolean {
  return getApiEnvironmentMode(request) === 'production'
}

/**
 * Check if API request is in dev-like environment (development or staging)
 */
export function isApiDevLike(request: NextRequest): boolean {
  const mode = getApiEnvironmentMode(request)
  return mode === 'development' || mode === 'staging'
}