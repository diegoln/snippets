import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified Middleware for AdvanceWeekly
 * 
 * With dedicated staging infrastructure (staging.advanceweekly.io), 
 * we no longer need complex path rewriting or environment detection.
 * 
 * Each environment is completely isolated:
 * - development: localhost:3000
 * - staging: staging.advanceweekly.io  
 * - production: advanceweekly.io
 * 
 * This middleware can be extended for future needs like:
 * - Security headers
 * - Rate limiting
 * - Request logging
 */

export function middleware(request: NextRequest) {
  // Simple pass-through - no complex logic needed!
  const response = NextResponse.next()
  
  // Add security headers (optional)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  return response
}

/**
 * Configure which paths this middleware should run on
 * Much simpler matcher - no staging path complexity!
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    '/((?!_next/static|_next/image|favicon.ico|brand|.*\\..*).*)',
  ],
}