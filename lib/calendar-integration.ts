/**
 * Google Calendar Integration
 * 
 * Simplified, focused implementation for extracting meeting context
 * from Google Calendar for weekly snippets and career tracking.
 * 
 * Uses dynamic imports to avoid loading heavy googleapis dependency
 * unless calendar integration is actually used.
 */

// Account model type for calendar integration
interface Account {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token?: string | null
  access_token?: string | null
  expires_at?: number | null
  token_type?: string | null
  scope?: string | null
}
import { format, parseISO } from 'date-fns'
import { RichIntegrationDataService, type RichCalendarData } from './rich-integration-data-service'

// Dynamic import helper for googleapis
let googleCache: any = null
async function loadGoogleApis() {
  if (!googleCache) {
    const { google } = await import('googleapis')
    googleCache = google
  }
  return googleCache
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    organizer?: boolean
    self?: boolean
  }>
  location?: string
  status: string
}

export interface WeeklyCalendarData {
  totalMeetings: number
  meetingContext: string[]
  keyMeetings: CalendarEvent[]
  weeklyContextSummary: string
}

// Extended interface for rich data (backwards compatible)
export interface EnhancedWeeklyCalendarData extends WeeklyCalendarData {
  meetingTranscripts?: any[]
  meetingDocs?: any[]
  hasTranscripts?: boolean
  hasDocs?: boolean
  weekNumber?: number
  year?: number
  dataSource?: string
}

export interface WeeklyDataRequest {
  weekStart: Date
  weekEnd: Date
  userId: string
}

export class CalendarIntegrationError extends Error {
  constructor(message: string, public code: string, public retryable: boolean = true) {
    super(message)
    this.name = 'CalendarIntegrationError'
  }
}

export class GoogleCalendarService {
  private oauth2Client: any

  private constructor() {
    // Private constructor - use static create method
  }

  /**
   * Create a new GoogleCalendarService instance with dynamic googleapis loading
   */
  static async create() {
    const google = await loadGoogleApis()
    const service = new GoogleCalendarService()
    service.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )
    return service
  }

  /**
   * Set OAuth credentials from database account
   */
  setCredentials(account: Account): void {
    if (!account.access_token) {
      throw new CalendarIntegrationError('No access token available', 'MISSING_TOKEN', false)
    }

    this.oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.expires_at ? account.expires_at * 1000 : undefined
    })
  }

  /**
   * Fetch weekly calendar data with proper error handling
   */
  async fetchWeeklyData(request: WeeklyDataRequest, account: Account): Promise<WeeklyCalendarData> {
    this.setCredentials(account)

    try {
      const events = await this.fetchCalendarEvents(request)
      return this.processCalendarData(events)
    } catch (error) {
      if (error instanceof CalendarIntegrationError) {
        throw error
      }
      
      // Handle Google API errors
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as any).code === 401) {
          throw new CalendarIntegrationError('Calendar access expired. Please reconnect.', 'TOKEN_EXPIRED', true)
        }
        
        if ((error as any).code === 403) {
          throw new CalendarIntegrationError('Insufficient calendar permissions', 'PERMISSION_DENIED', false)
        }
      }

      throw new CalendarIntegrationError(
        `Failed to fetch calendar data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        true
      )
    }
  }

  /**
   * Fetch calendar events from Google API
   */
  private async fetchCalendarEvents(request: WeeklyDataRequest): Promise<CalendarEvent[]> {
    const google = await loadGoogleApis()
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: request.weekStart.toISOString(),
      timeMax: request.weekEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50 // Reasonable limit
    })

    if (!response.data.items) {
      return []
    }

    return response.data.items
      .filter((event: any) => event.start?.dateTime) // Only timed events
      .map((event: any) => this.transformGoogleEvent(event))
  }

  /**
   * Transform Google Calendar event to our format
   */
  private transformGoogleEvent(event: any): CalendarEvent {
    return {
      id: event.id,
      summary: event.summary || 'Untitled Event',
      description: event.description,
      start: {
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone
      },
      attendees: event.attendees?.map((attendee: any) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        organizer: attendee.organizer || false,
        self: attendee.self || false
      })) || [],
      location: event.location,
      status: event.status || 'confirmed'
    }
  }

  /**
   * Process calendar events into career-relevant context
   */
  private processCalendarData(events: CalendarEvent[]): WeeklyCalendarData {
    const meetingContext = events.map(event => {
      const date = parseISO(event.start.dateTime)
      const dateStr = format(date, 'EEEE, MMM d')
      const attendeeCount = event.attendees?.length || 0
      
      let context = `${dateStr}: ${event.summary}`
      if (attendeeCount > 1) {
        context += ` (${attendeeCount} attendees)`
      }
      if (event.description) {
        context += ` - ${event.description}`
      }
      
      return context
    })

    const keyMeetings = this.identifyCareerRelevantMeetings(events)
    const weeklyContextSummary = this.generateWeeklySummary(events, keyMeetings)

    return {
      totalMeetings: events.length,
      meetingContext,
      keyMeetings,
      weeklyContextSummary
    }
  }

  /**
   * Identify meetings relevant for career development
   */
  private identifyCareerRelevantMeetings(events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(event => {
      const title = event.summary.toLowerCase()
      
      return title.includes('1:1') ||
             title.includes('review') ||
             title.includes('feedback') ||
             title.includes('demo') ||
             title.includes('presentation') ||
             title.includes('retrospective') ||
             title.includes('planning') ||
             title.includes('architecture') ||
             title.includes('design') ||
             title.includes('stakeholder')
    })
  }

  /**
   * Generate concise weekly summary for career context
   */
  private generateWeeklySummary(events: CalendarEvent[], keyMeetings: CalendarEvent[]): string {
    if (events.length === 0) {
      return "No meetings scheduled this week."
    }

    const oneOnOnes = events.filter(e => e.summary.toLowerCase().includes('1:1'))
    const presentations = events.filter(e => 
      e.summary.toLowerCase().includes('demo') || 
      e.summary.toLowerCase().includes('presentation')
    )
    
    let summary = `This week included ${events.length} meetings. `
    
    if (oneOnOnes.length > 0) {
      summary += `Had ${oneOnOnes.length} 1:1 meeting(s) for development discussions. `
    }
    
    if (presentations.length > 0) {
      summary += `Delivered ${presentations.length} presentation(s) or demo(s). `
    }
    
    if (keyMeetings.length > 0) {
      summary += `Participated in ${keyMeetings.length} career-relevant meetings including: `
      summary += keyMeetings.slice(0, 3).map(m => m.summary).join(', ')
      if (keyMeetings.length > 3) {
        summary += ` and ${keyMeetings.length - 3} others`
      }
      summary += '.'
    }
    
    return summary.trim()
  }

  /**
   * Test calendar connection
   */
  async testConnection(account: Account): Promise<boolean> {
    try {
      this.setCredentials(account)
      const google = await loadGoogleApis()
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
      await calendar.calendarList.list({ maxResults: 1 })
      return true
    } catch (error) {
      console.error('Calendar connection test failed:', error)
      return false
    }
  }

  /**
   * Generate mock data for development - now with rich data support
   */
  static async generateMockData(request: WeeklyDataRequest): Promise<EnhancedWeeklyCalendarData> {
    // Try to load rich data if available for this user
    if (RichIntegrationDataService.hasRichDataForUser(request.userId)) {
      const richData = await RichIntegrationDataService.getRichWeeklyData(request)
      if (richData) {
        // Convert rich data to calendar format
        return this.convertRichDataToCalendarData(richData)
      }
    }

    // Fallback to simple mock data for other users or when rich data fails
    const mockEvents: CalendarEvent[] = [
      {
        id: 'mock-1',
        summary: 'Sprint Planning',
        description: 'Weekly sprint planning session',
        start: { dateTime: request.weekStart.toISOString() },
        end: { dateTime: new Date(request.weekStart.getTime() + 2 * 60 * 60 * 1000).toISOString() },
        attendees: [
          { email: 'dev@company.com', displayName: 'Developer' },
          { email: 'manager@company.com', displayName: 'Manager' }
        ],
        status: 'confirmed'
      },
      {
        id: 'mock-2',
        summary: '1:1 with Manager',
        description: 'Weekly check-in',
        start: { dateTime: new Date(request.weekStart.getTime() + 24 * 60 * 60 * 1000).toISOString() },
        end: { dateTime: new Date(request.weekStart.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() },
        attendees: [
          { email: 'dev@company.com', displayName: 'Developer' },
          { email: 'manager@company.com', displayName: 'Manager' }
        ],
        status: 'confirmed'
      }
    ]

    return {
      totalMeetings: mockEvents.length,
      meetingContext: mockEvents.map(e => `${format(parseISO(e.start.dateTime), 'EEEE, MMM d')}: ${e.summary}`),
      keyMeetings: mockEvents.filter(e => e.summary.includes('1:1')),
      weeklyContextSummary: `This week included ${mockEvents.length} meetings. Had 1 1:1 meeting(s) for development discussions. Participated in 1 career-relevant meetings including: 1:1 with Manager.`,
      hasTranscripts: false,
      hasDocs: false,
      dataSource: 'simple-mock'
    }
  }

  /**
   * Convert rich data to enhanced calendar data format
   */
  private static convertRichDataToCalendarData(richData: RichCalendarData): EnhancedWeeklyCalendarData {
    return {
      totalMeetings: richData.totalMeetings,
      meetingContext: richData.meetingContext,
      keyMeetings: richData.keyMeetings,
      weeklyContextSummary: richData.weeklyContextSummary,
      meetingTranscripts: richData.meetingTranscripts,
      meetingDocs: richData.meetingDocs,
      hasTranscripts: richData.hasTranscripts,
      hasDocs: richData.hasDocs,
      weekNumber: richData.weekNumber,
      year: richData.year,
      dataSource: richData.dataSource
    }
  }

  /**
   * Get conversation excerpts for consolidation (when available)
   */
  static async getConversationExcerpts(request: WeeklyDataRequest): Promise<any[]> {
    if (!RichIntegrationDataService.hasRichDataForUser(request.userId)) {
      return []
    }

    const richData = await RichIntegrationDataService.getRichWeeklyData(request)
    if (!richData || !richData.hasTranscripts) {
      return []
    }

    return RichIntegrationDataService.extractConversationExcerpts(richData.meetingTranscripts)
  }

}