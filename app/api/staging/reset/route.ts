import { NextRequest, NextResponse } from 'next/server'
import { isStaging } from '../../../../lib/environment'
import { initializeStagingData } from '../../../../lib/staging-service'

/**
 * Staging Data Reset API Endpoint
 * 
 * POST /api/staging/reset
 * Resets all staging data and reinitializes with fresh mock data
 * Only available in staging environment for safety
 */

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in staging environment
    if (!isStaging()) {
      return NextResponse.json(
        { error: 'This endpoint is only available in staging environment' },
        { status: 403 }
      )
    }

    console.log('🔄 Staging data reset requested...')
    
    // Reinitialize staging data
    await initializeStagingData()
    
    console.log('✅ Staging data reset completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Staging data reset and reinitialized successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error resetting staging data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to reset staging data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to reset staging data.' },
    { status: 405 }
  )
}