import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../lib/auth-utils'
import { createUserDataService } from '../../../lib/user-scoped-data'
import { GoogleCalendarService } from '../../../lib/calendar-integration'

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
    
    const userId = await getUserIdFromRequest(request)
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

        const mockData = GoogleCalendarService.generateMockData({
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
 * POST /api/integrations - Create new integration
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
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

    const dataService = createUserDataService(userId)

    try {
      // Check if integration already exists
      const existingIntegrations = await dataService.getIntegrations()
      const existingIntegration = existingIntegrations.find(i => i.type === type)
      
      if (existingIntegration) {
        return NextResponse.json(
          { error: 'Integration already exists for this service' },
          { status: 409 }
        )
      }

      // Create placeholder integration (OAuth flow would happen here in production)
      const integration = await dataService.createIntegration({
        type: 'google_calendar',
        accessToken: 'placeholder-token', // Would be real OAuth token in production
        refreshToken: null,
        expiresAt: null,
        metadata: { 
          status: 'placeholder',
          note: 'This is a development placeholder. Real OAuth implementation needed for production.'
        },
        isActive: true
      })

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
    console.error('Error creating integration:', error)
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations/[id] - Remove integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
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
      // Delete integration (this would also revoke OAuth tokens in production)
      await dataService.deleteIntegration(integrationId)

      return NextResponse.json({
        success: true,
        message: 'Integration removed successfully'
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    )
  }
}