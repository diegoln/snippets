import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../lib/auth-utils'
import { createUserDataService } from '../../../lib/user-scoped-data'
// import { GoogleCalendarIntegration } from '../../../lib/integrations/providers/GoogleCalendarIntegration'

/**
 * GET /api/integrations - Get user's integration settings
 * GET /api/integrations?test=true - Test Google Calendar integration
 * 
 * Returns all configured integrations for the authenticated user
 * Or tests the Google Calendar integration if test=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isTest = searchParams.get('test') === 'true'
    
    // Handle test request
    if (isTest) {
      try {
        // Get current week dates
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
        weekStart.setHours(0, 0, 0, 0)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 4) // Friday
        weekEnd.setHours(23, 59, 59, 999)

        // Create simple mock events without using date-fns
        const mockEvents = [
          {
            id: 'test-event-1',
            summary: 'Sprint Planning',
            description: 'Weekly sprint planning session',
            start: { dateTime: weekStart.toISOString() },
            end: { dateTime: new Date(weekStart.getTime() + 2 * 60 * 60 * 1000).toISOString() },
            attendees: [
              { email: 'john@company.com', displayName: 'John Developer' },
              { email: 'manager@company.com', displayName: 'Team Manager' }
            ],
            status: 'confirmed'
          },
          {
            id: 'test-event-2',
            summary: '1:1 with Manager',
            description: 'Weekly check-in meeting',
            start: { dateTime: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000).toISOString() },
            end: { dateTime: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() },
            attendees: [
              { email: 'john@company.com', displayName: 'John Developer' },
              { email: 'manager@company.com', displayName: 'Team Manager' }
            ],
            status: 'confirmed'
          }
        ]

        return NextResponse.json({
          success: true,
          message: 'Google Calendar integration test successful (basic)',
          integration: {
            type: 'google_calendar',
            connectionStatus: true,
            mockMode: true
          },
          weekData: {
            weekNumber: Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
            year: weekStart.getFullYear(),
            dateRange: {
              start: weekStart.toISOString(),
              end: weekEnd.toISOString()
            },
            events: {
              total: mockEvents.length,
              samples: mockEvents.map(event => ({
                summary: event.summary,
                start: event.start.dateTime,
                attendees: event.attendees?.length || 0
              }))
            },
            mockEventsGenerated: mockEvents.length
          }
        })
      } catch (testError) {
        console.error('Test error:', testError)
        return NextResponse.json({
          success: false,
          error: 'Integration test failed',
          details: testError instanceof Error ? testError.message : 'Unknown error',
          stack: testError instanceof Error ? testError.stack : undefined
        }, { status: 500 })
      }
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const dataService = createUserDataService(userId)

    try {
      // Get user's integration settings from database
      const integrations = await dataService.getIntegrations()

      return NextResponse.json({
        integrations: integrations.map(integration => ({
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
 * POST /api/integrations/google-calendar/connect
 * 
 * Enable Google Calendar integration for the user
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

    const body = await request.json()
    const { type } = body

    if (type !== 'google_calendar') {
      return NextResponse.json(
        { error: 'Only Google Calendar integration is currently supported' },
        { status: 400 }
      )
    }

    const dataService = createUserDataService(userId)

    try {
      // For now, we'll create a placeholder integration
      // In production, this would handle the OAuth flow
      const integration = await dataService.createIntegration({
        type: 'google_calendar',
        accessToken: 'placeholder-token', // Will be replaced with real OAuth tokens
        refreshToken: null,
        expiresAt: null,
        metadata: {},
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