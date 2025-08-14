import { NextRequest, NextResponse } from 'next/server'
import { isStaging, isDevelopment } from '../../../../lib/environment'
import { RichDataSeedingService } from '../../../../lib/rich-data-seeding-service'

// Force dynamic rendering - critical for environment-specific behavior
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Rich Data Seeding API Endpoint
 * 
 * POST /api/staging/seed-rich-data
 * Seeds rich integration data for users with available datasets
 * Only available in staging and development environments for safety
 */

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in staging or development environment
    if (!isStaging() && !isDevelopment()) {
      return NextResponse.json(
        { error: 'This endpoint is only available in staging and development environments' },
        { status: 403 }
      )
    }

    const environment = isStaging() ? 'staging' : 'development'
    console.log(`🌟 Rich data seeding requested for ${environment}...`)
    
    // Seed rich data for users with available datasets
    const userIds = ['1', 'jack@company.com', 'jack@example.com', 'dev-user-123']
    await RichDataSeedingService.seedRichDataForUsers(userIds, environment)
    
    console.log(`✅ Rich data seeding completed for ${environment}`)
    
    return NextResponse.json({
      success: true,
      message: `Rich integration data seeded successfully for ${environment}`,
      environment,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error seeding rich data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to seed rich integration data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to seed rich data.' },
    { status: 405 }
  )
}