import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../lib/dev-auth'
import { createUserDataService } from '../../../lib/user-scoped-data'
import { GoogleCalendarService } from '../../../lib/calendar-integration'
import { getToken } from 'next-auth/jwt'

// Input validation schemas
const ConnectIntegrationSchema = z.object({
  type: z.literal('google_calendar')
})

/**
 * GET /api/integrations - Get user's integrations
 * GET /api/integrations?test=true - Test Google Calendar integration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isTest = searchParams.get('test') === 'true'
    
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Handle test request with mock data
    if (isTest) {
      try {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 4) // Friday
        weekEnd.setHours(23, 59, 59, 999)

        const mockData = await GoogleCalendarService.generateMockData({
          weekStart,
          weekEnd,
          userId
        })

        return NextResponse.json({
          success: true,
          message: 'Google Calendar integration test successful',
          integration: {
            type: 'google_calendar',
            connectionStatus: true,
            mockMode: true
          },
          weekData: {
            dateRange: {
              start: weekStart.toISOString(),
              end: weekEnd.toISOString()
            },
            ...mockData
          }
        })
      } catch (error) {
        console.error('Integration test error:', error)
        return NextResponse.json({
          success: false,
          error: 'Integration test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Get user's integrations from database
    const dataService = createUserDataService(userId)

    try {
      const integrations = await dataService.getIntegrations()

      return NextResponse.json({
        integrations: integrations.map((integration: any) => ({
          id: integration.id,
          type: integration.type,
          isActive: integration.isActive,
          lastSyncAt: integration.lastSyncAt?.toISOString(),
          createdAt: integration.createdAt.toISOString()
        }))
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations - Enable calendar integration
 */
export async function POST(request: NextRequest) {
  try {
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validationResult = ConnectIntegrationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { type } = validationResult.data

    // For production: Check if user has OAuth tokens for Google Calendar
    if (process.env.NODE_ENV === 'production') {
      const token = await getToken({ req: request })
      if (!token?.accessToken) {
        return NextResponse.json(
          { error: 'Google OAuth access required. Please sign in with Google.' },
          { status: 401 }
        )
      }
    }

    const dataService = createUserDataService(userId)

    try {
      // Check if integration already exists
      const existingIntegrations = await dataService.getIntegrations()
      const existingIntegration = existingIntegrations.find((i: any) => i.type === type)
      
      if (existingIntegration) {
        return NextResponse.json(
          { error: 'Calendar integration is already enabled' },
          { status: 409 }
        )
      }

      let integration
      if (process.env.NODE_ENV === 'production') {
        // Use real OAuth tokens in production
        const token = await getToken({ req: request })
        integration = await dataService.createIntegration({
          type: 'google_calendar',
          accessToken: typeof token?.accessToken === 'string' ? token.accessToken : '',
          refreshToken: typeof token?.refreshToken === 'string' ? token.refreshToken : null,
          expiresAt: typeof token?.expiresAt === 'number' ? new Date(token.expiresAt * 1000) : null,
          metadata: { 
            status: 'active',
            grantedScopes: ['calendar.readonly', 'meetings.space.readonly', 'drive.readonly']
          },
          isActive: true
        })
      } else {
        // Development mode - create integration record for mock data
        integration = await dataService.createIntegration({
          type: 'google_calendar',
          accessToken: 'dev-mock-token',
          refreshToken: null,
          expiresAt: null,
          metadata: { 
            status: 'development',
            note: 'Development mode - using mock calendar data'
          },
          isActive: true
        })
      }

      return NextResponse.json({
        success: true,
        integration: {
          id: integration.id,
          type: integration.type,
          isActive: integration.isActive,
          createdAt: integration.createdAt.toISOString()
        }
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error enabling integration:', error)
    return NextResponse.json(
      { error: 'Failed to enable calendar integration' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations/[id] - Disable calendar integration
 */
export async function DELETE(request: NextRequest) {
  try {
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('id')
    
    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID required' },
        { status: 400 }
      )
    }

    const dataService = createUserDataService(userId)

    try {
      // Disable integration (keep OAuth tokens available for re-enabling)
      // In production, we don't revoke the OAuth tokens since they're granted at sign-in
      await dataService.deleteIntegration(integrationId)

      return NextResponse.json({
        success: true,
        message: 'Calendar integration disabled successfully'
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error disabling integration:', error)
    return NextResponse.json(
      { error: 'Failed to disable calendar integration' },
      { status: 500 }
    )
  }
}