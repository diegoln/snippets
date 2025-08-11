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
  const environmentMode = getEnvironmentMode(request)
  response.headers.set('x-environment-mode', environmentMode)
  
  // Handle staging path rewriting
  if (isStaging) {
    // Remove /staging prefix from the path for internal routing
    const internalPath = pathname.replace(/^\/staging/, '') || '/'
    const url = request.nextUrl.clone()
    url.pathname = internalPath
    
    // Rewrite to internal path while preserving query parameters
    return NextResponse.rewrite(url)
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
 * - /staging and all sub-paths
 * - Root paths that need environment detection
 * 
 * We don't need to run on:
 * - Static assets (_next/static, images, etc.)
 * - API routes (they handle environment detection internally)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - brand (brand assets)
     * - Any file with an extension (.js, .css, .png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\..*).*)',
  ],
}