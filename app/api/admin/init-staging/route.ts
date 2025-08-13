import { NextRequest, NextResponse } from 'next/server'
import { initializeStagingData } from '../../../../lib/staging-service'
import { getEnvironmentMode } from '../../../../lib/environment'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Staging Database Initialization API
 * 
 * This endpoint initializes the staging database with schema and mock data.
 * Only available in staging environment for security.
 */
export async function POST(request: NextRequest) {
  try {
    const envMode = getEnvironmentMode()
    
    // Security: Only allow in staging environment
    if (envMode !== 'staging') {
      return NextResponse.json(
        { error: 'This endpoint is only available in staging environment' },
        { status: 403 }
      )
    }
    
    console.log('🚀 Starting staging database initialization...')
    
    // Initialize staging data using the unified service
    await initializeStagingData()
    
    console.log('✅ Staging database initialization completed!')
    
    return NextResponse.json({
      success: true,
      message: 'Staging database initialized successfully',
      environment: envMode
    })
    
  } catch (error) {
    console.error('❌ Error initializing staging database:', error)
    return NextResponse.json(
      { 
        error: 'Failed to initialize staging database',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: 'Use POST method to initialize staging database' }, { status: 405 })
}