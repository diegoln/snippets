import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware for AdvanceWeekly - Environment Detection and Routing
 * 
 * This middleware handles:
 * 1. Path-based environment detection (/staging vs production)
 * 2. Setting environment context headers for downstream components
 * 3. Staging route rewriting to enable sub-path hosting
 */

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  
  // Detect if this is a staging request
  const isStaging = pathname.startsWith('/staging')
  
  // Create response with environment context
  const response = NextResponse.next()
  
  // Set environment mode header for components to use
  const environmentMode = isStaging ? 'staging' : 'production'
  response.headers.set('x-environment-mode', environmentMode)
  
  // Handle staging path rewriting
  if (isStaging) {
    // Remove /staging prefix from the path for internal routing
    const internalPath = pathname.replace(/^\/staging/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = internalPath
    
    // CRITICAL: Preserve staging context through headers for authentication
    const response = NextResponse.rewrite(url)
    response.headers.set('x-environment-mode', 'staging')
    response.headers.set('x-staging-request', 'true')
    response.headers.set('x-original-path', pathname) // Preserve original path
    
    return response
  }
  
  return response
}

/**
 * Determine environment mode based on request context
 */
function getEnvironmentMode(request: NextRequest): 'development' | 'staging' | 'production' {
  // Local development
  if (process.env.NODE_ENV === 'development') {
    return 'development'
  }
  
  // Staging mode (production infrastructure + dev features)
  if (request.nextUrl.pathname.startsWith('/staging')) {
    return 'staging'
  }
  
  // Production mode
  return 'production'
}

/**
 * Configure which paths this middleware should run on
 * 
 * We want to run on:
 * - /staging and all sub-paths including /staging/api/* 
 * - Root paths that need environment detection
 * - API routes for staging environment detection
 * 
 * We don't need to run on:
 * - Static assets (_next/static, images, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - brand (brand assets)
     * - Any file with an extension (.js, .css, .png, etc.)
     * 
     * INCLUDE API routes for staging environment support
     */
    '/((?!_next/static|_next/image|favicon.ico|brand|.*\\..*).*)',
  ],
}