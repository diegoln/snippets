import { NextResponse } from 'next/server'
import { getEnvironmentMode } from '../../../lib/environment'

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
    
    // Debug logging to understand environment variable detection
    console.log('🔍 Server Environment Debug:', {
      environment,
      processEnvRUNTIME_ENV: process.env.RUNTIME_ENV,
      processEnvNODE_ENV: process.env.NODE_ENV,
      runtimeEnvFallback: process.env.RUNTIME_ENV || process.env.NODE_ENV,
      allEnvVars: {
        NODE_ENV: process.env.NODE_ENV,
        RUNTIME_ENV: process.env.RUNTIME_ENV,
        ENVIRONMENT_MODE: process.env.ENVIRONMENT_MODE
      }
    })
    
    return NextResponse.json(
      { 
        environment,
        debug: {
          RUNTIME_ENV: process.env.RUNTIME_ENV,
          NODE_ENV: process.env.NODE_ENV,
          detected: environment
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error getting environment mode:', error)
    return NextResponse.json(
      { environment: 'production', error: 'Failed to detect environment' },
      { status: 500 }
    )
  }
}