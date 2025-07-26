/**
 * Google Calendar Integration
 * 
 * Fetches calendar events from Google Calendar API and processes them
 * into meaningful insights for weekly snippet generation.
 */

import { google } from 'googleapis'
import { BaseIntegration } from '../base/BaseIntegration'
import { 
  IntegrationConfig, 
  IntegrationData, 
  WeeklyDataRequest, 
  AuthTokens,
  CalendarEvent,
  ProcessedCalendarData
} from '../base/types'
import { generateMockCalendarEvents } from '../mock-data/calendar-events'
import { 
  isWithinInterval, 
  parseISO, 
  differenceInHours,
  getHours,
  startOfDay,
  format
} from 'date-fns'

export class GoogleCalendarIntegration extends BaseIntegration {
  private oauth2Client: any

  constructor(config: IntegrationConfig) {
    super(config)
    this.initializeOAuth()
  }

  private initializeOAuth(): void {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )
  }

  /**
   * Set authentication tokens and configure OAuth client
   */
  setTokens(tokens: AuthTokens): void {
    super.setTokens(tokens)
    
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiresAt ? tokens.expiresAt * 1000 : undefined
      })
    }
  }

  /**
   * Fetch weekly calendar data
   */
  async fetchWeeklyData(request: WeeklyDataRequest): Promise<IntegrationData> {
    // Temporarily disable logging to debug the issue
    // this.log('info', 'Fetching weekly calendar data', { 
    //   weekStart: request.weekStart,
    //   weekEnd: request.weekEnd,
    //   useRealAPI: this.shouldUseRealAPI()
    // })

    try {
      if (!this.shouldUseRealAPI()) {
        return await this.getMockData(request)
      }

      if (!this.isAuthenticated()) {
        throw this.createError('Not authenticated with Google Calendar', 'AUTH_REQUIRED', false)
      }

      const events = await this.fetchRealCalendarEvents(request)
      const processedData = this.transformData(events)

      return {
        id: `calendar-${request.userId}-${format(request.weekStart, 'yyyy-ww')}`,
        userId: request.userId,
        integrationType: 'google_calendar',
        weekNumber: this.getWeekNumber(request.weekStart),
        year: request.weekStart.getFullYear(),
        dataType: 'meetings',
        rawData: events,
        processedData,
        createdAt: new Date()
      }
    } catch (error) {
      // this.log('error', 'Failed to fetch calendar data', error)
      throw error
    }
  }

  /**
   * Fetch real calendar events from Google Calendar API
   */
  private async fetchRealCalendarEvents(request: WeeklyDataRequest): Promise<CalendarEvent[]> {
    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: request.weekStart.toISOString(),
        timeMax: request.weekEnd.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
      })

      if (!response.data.items) {
        return []
      }

      // Transform Google Calendar events to our format
      return response.data.items
        .filter(event => event.start?.dateTime) // Only include events with specific times
        .map(event => this.transformGoogleEvent(event))
    } catch (error) {
      if (error.code === 401) {
        throw this.createError('Calendar access token expired', 'TOKEN_EXPIRED', true)
      }
      throw this.createError(`Failed to fetch calendar events: ${error.message}`, 'API_ERROR', true)
    }
  }

  /**
   * Transform Google Calendar event to our standard format
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
      organizer: event.organizer ? {
        email: event.organizer.email,
        displayName: event.organizer.displayName
      } : undefined,
      location: event.location,
      status: event.status || 'confirmed',
      recurring: !!event.recurringEventId
    }
  }

  /**
   * Transform raw calendar events into contextual summaries for career progress
   */
  protected transformData(events: CalendarEvent[]): ProcessedCalendarData {
    const meetingSummaries = this.extractMeetingContext(events)
    const keyMeetings = this.identifyImportantMeetings(events)
    const weeklyContext = this.generateWeeklyContext(events)

    return {
      meetingSummaries,
      keyMeetings,
      weeklyContext,
      totalMeetings: events.length
    }
  }

  /**
   * Extract meaningful context from calendar events for career progress analysis
   */
  private extractMeetingContext(events: CalendarEvent[]): string[] {
    return events.map(event => {
      const title = event.summary
      const description = event.description || ''
      const attendeeCount = event.attendees?.length || 0
      const date = parseISO(event.start.dateTime)
      const dateStr = format(date, 'EEEE, MMM d')
      
      // Create a contextual summary for each meeting
      let context = `${dateStr}: ${title}`
      
      if (attendeeCount > 1) {
        context += ` (${attendeeCount} attendees)`
      }
      
      if (description) {
        context += ` - ${description}`
      }
      
      return context
    })
  }

  /**
   * Identify meetings important for career development context
   */
  private identifyImportantMeetings(events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(event => {
      const title = event.summary.toLowerCase()
      
      // Focus on career-relevant meetings
      const isCareerRelevant = 
        title.includes('1:1') ||
        title.includes('review') ||
        title.includes('feedback') ||
        title.includes('planning') ||
        title.includes('demo') ||
        title.includes('presentation') ||
        title.includes('retrospective') ||
        title.includes('architecture') ||
        title.includes('design') ||
        title.includes('technical') ||
        title.includes('project') ||
        title.includes('stakeholder')

      return isCareerRelevant
    })
  }

  /**
   * Generate weekly context summary for LLM analysis
   */
  private generateWeeklyContext(events: CalendarEvent[]): string {
    if (events.length === 0) {
      return "No meetings scheduled this week."
    }

    const importantMeetings = this.identifyImportantMeetings(events)
    const oneOnOnes = events.filter(e => e.summary.toLowerCase().includes('1:1'))
    const presentations = events.filter(e => 
      e.summary.toLowerCase().includes('demo') || 
      e.summary.toLowerCase().includes('presentation')
    )
    
    let context = `This week included ${events.length} meetings. `
    
    if (oneOnOnes.length > 0) {
      context += `Had ${oneOnOnes.length} 1:1 meeting(s) for personal development and feedback. `
    }
    
    if (presentations.length > 0) {
      context += `Gave ${presentations.length} presentation(s) or demo(s), demonstrating technical work. `
    }
    
    if (importantMeetings.length > 0) {
      context += `Participated in ${importantMeetings.length} career-relevant meetings including: `
      context += importantMeetings.slice(0, 3).map(m => m.summary).join(', ')
      if (importantMeetings.length > 3) {
        context += ` and ${importantMeetings.length - 3} others`
      }
      context += '. '
    }
    
    return context.trim()
  }

  /**
   * Get week number from date
   */
  private getWeekNumber(date: Date): number {
    const start = startOfDay(date)
    const startOfYear = startOfDay(new Date(date.getFullYear(), 0, 1))
    const diff = start.getTime() - startOfYear.getTime()
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
  }

  /**
   * Get mock calendar data for development
   */
  protected async getMockData(request: WeeklyDataRequest): Promise<IntegrationData> {
    // this.log('info', 'Using mock calendar data for development')
    
    const mockEvents = generateMockCalendarEvents(request.weekStart)
    const processedData = this.transformData(mockEvents)

    return {
      id: `mock-calendar-${request.userId}-${format(request.weekStart, 'yyyy-ww')}`,
      userId: request.userId,
      integrationType: 'google_calendar',
      weekNumber: this.getWeekNumber(request.weekStart),
      year: request.weekStart.getFullYear(),
      dataType: 'meetings',
      rawData: mockEvents,
      processedData,
      createdAt: new Date()
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw this.createError('No refresh token available', 'REFRESH_TOKEN_MISSING', false)
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: this.tokens.refreshToken
      })

      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      const newTokens: AuthTokens = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || this.tokens.refreshToken,
        expiresAt: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : undefined
      }

      this.setTokens(newTokens)
      return newTokens
    } catch (error) {
      throw this.createError(`Failed to refresh tokens: ${error.message}`, 'REFRESH_FAILED', false)
    }
  }

  /**
   * Test the calendar connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.shouldUseRealAPI()) {
        // this.log('info', 'Mock mode - connection test passed')
        return true
      }

      if (!this.isAuthenticated()) {
        return false
      }

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
      await calendar.calendarList.list({ maxResults: 1 })
      
      // this.log('info', 'Calendar connection test successful')
      return true
    } catch (error) {
      // this.log('error', 'Calendar connection test failed', error)
      return false
    }
  }
}