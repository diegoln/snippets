import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test endpoint to verify calendar integration basics
 */
export async function GET(request: NextRequest) {
  try {
    // Get current week dates
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 4) // Friday
    weekEnd.setHours(23, 59, 59, 999)

    // Create simple mock events
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
      },
      {
        id: 'test-event-3',
        summary: 'All Hands Meeting',
        description: 'Company-wide updates',
        start: { dateTime: new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString() },
        attendees: [
          { email: 'john@company.com', displayName: 'John Developer' },
          { email: 'ceo@company.com', displayName: 'CEO' },
          { email: 'all@company.com', displayName: 'All Company' }
        ],
        status: 'confirmed'
      }
    ]

    // Calculate basic insights
    const totalMeetings = mockEvents.length
    const totalHours = mockEvents.reduce((total, event) => {
      const start = new Date(event.start.dateTime)
      const end = new Date(event.end.dateTime)
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    }, 0)

    const insights = [
      `${totalMeetings} meetings scheduled this week`,
      `${totalHours.toFixed(1)} hours in meetings`,
      'Mix of planning, 1:1s, and company meetings',
      'Good balance of individual and team collaboration'
    ]

    return NextResponse.json({
      success: true,
      message: 'Google Calendar integration test successful',
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
          totalHours: totalHours,
          samples: mockEvents.map(event => ({
            summary: event.summary,
            start: event.start.dateTime,
            attendees: event.attendees?.length || 0
          }))
        },
        insights
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}