import { NextResponse } from 'next/server'
import { getEnvironmentMode } from '../../../lib/environment'

// Force this route to be dynamically rendered at runtime
// This prevents Next.js from caching/pre-rendering with build-time env values
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Runtime Environment Detection API
 * 
 * This endpoint provides the correct runtime environment mode to client-side components.
 * Since client-side components can't access runtime environment variables (only build-time),
 * this API allows them to get the correct environment from the server.
 * 
 * GET /api/environment
 * Returns: { environment: 'development' | 'staging' | 'production' }
 */
export async function GET() {
  try {
    const environment = getEnvironmentMode()
    
    const response = NextResponse.json(
      { environment },
      { status: 200 }
    )
    
    // Explicitly set headers after creating the response
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Content-Type', 'application/json')
    
    return response
  } catch (error) {
    console.error('Error getting environment mode:', error)
    return NextResponse.json(
      { environment: 'production', error: 'Failed to detect environment' },
      { status: 500 }
    )
  }
}