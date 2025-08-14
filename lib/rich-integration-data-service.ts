/**
 * Rich Integration Data Service
 * 
 * Loads and serves Jack Thompson's rich mock dataset including calendar events,
 * meeting transcripts, and Google Docs. Provides production-like data structure
 * for enhanced consolidation and reflection generation.
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { getISOWeek, setISOWeek, startOfISOWeek, endOfISOWeek } from 'date-fns'

// Extended interfaces for rich data support
export interface MeetTranscriptEntry {
  name: string
  participant: string
  text: string
  languageCode: string
  startTime: string
  endTime: string
}

export interface MeetTranscript {
  conferenceRecord: {
    name: string
    startTime: string
    endTime: string
    space: {
      name: string
      meetingUri: string
    }
  }
  transcript: {
    name: string
    state: string
    startTime: string
    endTime: string
  }
  transcriptEntries: MeetTranscriptEntry[]
}

export interface MeetingDoc {
  kind: string
  documentId: string
  title: string
  body: {
    content: Array<{
      startIndex: number
      endIndex: number
      paragraph?: {
        elements: Array<{
          startIndex: number
          endIndex: number
          textRun?: {
            content: string
            textStyle?: any
          }
        }>
      }
    }>
  }
}

export interface RichCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
  }
  end: {
    dateTime: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    organizer?: boolean
    self?: boolean
  }>
  organizer?: {
    email: string
    displayName: string
  }
  location?: string
  status: string
  recurring?: string
}

export interface RichCalendarData {
  totalMeetings: number
  meetingContext: string[]
  keyMeetings: RichCalendarEvent[]
  weeklyContextSummary: string
  meetingTranscripts: MeetTranscript[]
  meetingDocs: MeetingDoc[]
  hasTranscripts: boolean
  hasDocs: boolean
  weekNumber: number
  year: number
  dataSource: 'jack-thompson-oct-2024'
}

export interface WeeklyDataRequest {
  weekStart: Date
  weekEnd: Date
  userId: string
}

/**
 * Service for loading Jack Thompson's rich mock data
 */
export class RichIntegrationDataService {
  private static readonly JACK_DATASET_PATH = path.join(
    process.cwd(), 
    'data/mock-datasets/users/jack-thompson-oct-2024'
  )

  /**
   * Check if rich data is available for a user (currently only Jack Thompson dataset)
   */
  static hasRichDataForUser(userId: string): boolean {
    // For now, only Jack Thompson data is available
    // Future: expand to support more users with different datasets
    const jackIdentifiers = [
      'jack@company.com',
      'jack@example.com', 
      '1', // Development user ID
      'dev-user-123' // Alternative dev user ID
    ]
    return jackIdentifiers.includes(userId)
  }

  /**
   * Load rich calendar data for a specific week
   */
  static async getRichWeeklyData(request: WeeklyDataRequest): Promise<RichCalendarData | null> {
    if (!this.hasRichDataForUser(request.userId)) {
      return null
    }

    const weekNumber = getISOWeek(request.weekStart)
    const year = request.weekStart.getFullYear()

    // Jack's dataset covers weeks 40-44 of 2024
    if (year !== 2024 || weekNumber < 40 || weekNumber > 44) {
      return null
    }

    try {
      // Load calendar events (required)
      const calendarEvents = await this.loadCalendarEvents()
      const weekEvents = this.filterEventsByWeek(calendarEvents, weekNumber, year)

      // Load optional data with individual error handling
      let transcripts: MeetTranscript[] = []
      try {
        transcripts = await this.loadWeekTranscripts(weekNumber)
      } catch (error) {
        console.warn(`Failed to load transcripts for week ${weekNumber}:`, error)
      }

      let docs: MeetingDoc[] = []
      try {
        docs = await this.loadWeekDocs(weekNumber)
      } catch (error) {
        console.warn(`Failed to load docs for week ${weekNumber}:`, error)
      }

      // Process into rich calendar data structure
      return this.processRichCalendarData(weekEvents, transcripts, docs, weekNumber, year)

    } catch (error) {
      console.error(`Error loading rich data for week ${weekNumber}, ${year}:`, error)
      return null
    }
  }

  /**
   * Load all calendar events from Jack's dataset
   */
  static async loadCalendarEvents(): Promise<RichCalendarEvent[]> {
    const calendarPath = path.join(
      this.JACK_DATASET_PATH, 
      'calendar-events/jack-raw-google-calendar-events.json'
    )
    
    try {
      const fileContent = await fs.readFile(calendarPath, 'utf8')
      return JSON.parse(fileContent) as RichCalendarEvent[]
    } catch (error) {
      console.error('Error loading calendar events:', error)
      return []
    }
  }

  /**
   * Filter calendar events by ISO week number
   */
  static filterEventsByWeek(
    events: RichCalendarEvent[], 
    weekNumber: number, 
    year: number
  ): RichCalendarEvent[] {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime)
      const eventWeek = getISOWeek(eventDate)
      const eventYear = eventDate.getFullYear()
      return eventWeek === weekNumber && eventYear === year
    })
  }

  /**
   * Load meeting transcripts for a specific week
   */
  static async loadWeekTranscripts(weekNumber: number): Promise<MeetTranscript[]> {
    const transcriptsDir = path.join(this.JACK_DATASET_PATH, 'meet-transcripts')
    const transcripts: MeetTranscript[] = []

    try {
      const files = await fs.readdir(transcriptsDir)
      const weekFiles = files.filter(file => 
        file.startsWith(`week${weekNumber}-`) && file.endsWith('.json')
      )

      for (const file of weekFiles) {
        try {
          const filePath = path.join(transcriptsDir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const transcript = JSON.parse(content) as MeetTranscript
          transcripts.push(transcript)
        } catch (error) {
          console.error(`Error loading transcript ${file}:`, error)
        }
      }
    } catch (error) {
      console.error(`Error loading transcripts for week ${weekNumber}:`, error)
    }

    return transcripts
  }

  /**
   * Load meeting docs for a specific week
   */
  static async loadWeekDocs(weekNumber: number): Promise<MeetingDoc[]> {
    const docsDir = path.join(this.JACK_DATASET_PATH, 'google-docs')
    const docs: MeetingDoc[] = []

    try {
      const files = await fs.readdir(docsDir)
      
      // Calculate the actual date range for this week
      const year = 2024 // Jack's dataset is from 2024
      const weekStart = this.getWeekStartDate(weekNumber, year)
      const weekEnd = this.getWeekEndDate(weekNumber, year)
      
      const weekFiles = files.filter(file => {
        if (!file.endsWith('.json')) return false
        
        // Try to parse date from filename (various patterns)
        const dateMatch = file.match(/(?:Oct|October)\s*(\d{1,2})|(\d{4})-(\d{1,2})-(\d{1,2})/)
        if (!dateMatch) return false
        
        let fileDate: Date
        if (dateMatch[1]) {
          // "Oct 1" or "October 1" format
          const day = parseInt(dateMatch[1])
          fileDate = new Date(2024, 9, day) // October is month 9
        } else if (dateMatch[2] && dateMatch[3] && dateMatch[4]) {
          // "2024-10-01" format
          fileDate = new Date(parseInt(dateMatch[2]), parseInt(dateMatch[3]) - 1, parseInt(dateMatch[4]))
        } else {
          return false
        }
        
        // Check if file date falls within the week
        return fileDate >= weekStart && fileDate <= weekEnd
      })

      for (const file of weekFiles) {
        try {
          const filePath = path.join(docsDir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const doc = JSON.parse(content) as MeetingDoc
          docs.push(doc)
        } catch (error) {
          console.error(`Error loading doc ${file}:`, error)
        }
      }
    } catch (error) {
      console.error(`Error loading docs for week ${weekNumber}:`, error)
    }

    return docs
  }

  /**
   * Process raw data into rich calendar data structure
   */
  static processRichCalendarData(
    events: RichCalendarEvent[],
    transcripts: MeetTranscript[],
    docs: MeetingDoc[],
    weekNumber: number,
    year: number
  ): RichCalendarData {
    // Generate meeting context with transcript awareness
    const meetingContext = events.map(event => {
      const eventDate = new Date(event.start.dateTime)
      const dateStr = eventDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
      
      let context = `${dateStr}: ${event.summary}`
      
      // Add attendee count
      if (event.attendees && event.attendees.length > 1) {
        context += ` (${event.attendees.length} attendees)`
      }

      // Add description if available
      if (event.description) {
        context += ` - ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`
      }

      // Indicate if transcript is available
      const hasTranscript = transcripts.some(t => 
        this.matchTranscriptToEvent(t, event)
      )
      if (hasTranscript) {
        context += ' [Transcript Available]'
      }

      return context
    })

    // Identify career-relevant meetings
    const keyMeetings = this.identifyCareerRelevantMeetings(events)

    // Generate weekly summary with rich context
    const weeklyContextSummary = this.generateRichWeeklySummary(
      events, 
      keyMeetings, 
      transcripts, 
      docs
    )

    return {
      totalMeetings: events.length,
      meetingContext,
      keyMeetings,
      weeklyContextSummary,
      meetingTranscripts: transcripts,
      meetingDocs: docs,
      hasTranscripts: transcripts.length > 0,
      hasDocs: docs.length > 0,
      weekNumber,
      year,
      dataSource: 'jack-thompson-oct-2024'
    }
  }

  /**
   * Match transcript to calendar event based on timing and participants
   */
  private static matchTranscriptToEvent(
    transcript: MeetTranscript, 
    event: RichCalendarEvent
  ): boolean {
    const transcriptStart = new Date(transcript.conferenceRecord.startTime).getTime()
    const eventStart = new Date(event.start.dateTime).getTime()
    const eventEnd = new Date(event.end.dateTime).getTime()

    // Check if the transcript's start time is within the event's duration, 
    // allowing for a small buffer (e.g., 5 minutes) for timing discrepancies.
    const buffer = 5 * 60 * 1000
    return transcriptStart >= eventStart - buffer && transcriptStart <= eventEnd + buffer
  }

  /**
   * Identify meetings relevant for career development
   */
  private static identifyCareerRelevantMeetings(events: RichCalendarEvent[]): RichCalendarEvent[] {
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
             title.includes('stakeholder') ||
             title.includes('urgent') ||
             title.includes('debug') ||
             title.includes('deep dive') ||
             title.includes('pair programming')
    })
  }

  /**
   * Generate rich weekly summary incorporating all data sources
   */
  private static generateRichWeeklySummary(
    events: RichCalendarEvent[],
    keyMeetings: RichCalendarEvent[],
    transcripts: MeetTranscript[],
    docs: MeetingDoc[]
  ): string {
    if (events.length === 0) {
      return "No meetings scheduled this week."
    }

    const oneOnOnes = events.filter(e => e.summary.toLowerCase().includes('1:1'))
    const presentations = events.filter(e => 
      e.summary.toLowerCase().includes('demo') || 
      e.summary.toLowerCase().includes('presentation')
    )
    const urgentMeetings = events.filter(e => 
      e.summary.toLowerCase().includes('urgent') ||
      e.summary.toLowerCase().includes('debug')
    )
    
    let summary = `This week included ${events.length} meetings. `
    
    if (oneOnOnes.length > 0) {
      summary += `Had ${oneOnOnes.length} 1:1 meeting(s) for development discussions. `
    }
    
    if (presentations.length > 0) {
      summary += `Delivered ${presentations.length} presentation(s) or demo(s). `
    }

    if (urgentMeetings.length > 0) {
      summary += `Responded to ${urgentMeetings.length} urgent issue(s) or debug session(s). `
    }
    
    if (keyMeetings.length > 0) {
      summary += `Participated in ${keyMeetings.length} career-relevant meetings including: `
      summary += keyMeetings.slice(0, 3).map(m => m.summary).join(', ')
      if (keyMeetings.length > 3) {
        summary += ` and ${keyMeetings.length - 3} others`
      }
      summary += '. '
    }

    // Add rich data context
    if (transcripts.length > 0) {
      summary += `Meeting transcripts available for ${transcripts.length} session(s). `
    }

    if (docs.length > 0) {
      summary += `Meeting notes documented in ${docs.length} Google Doc(s). `
    }
    
    return summary.trim()
  }

  /**
   * Get available weeks for Jack's dataset
   */
  static getAvailableWeeks(): Array<{ weekNumber: number; year: number; dateRange: string }> {
    return [
      { weekNumber: 40, year: 2024, dateRange: 'Oct 1-4, 2024' },
      { weekNumber: 41, year: 2024, dateRange: 'Oct 8-11, 2024' },
      { weekNumber: 42, year: 2024, dateRange: 'Oct 15-18, 2024' },
      { weekNumber: 43, year: 2024, dateRange: 'Oct 21-25, 2024' },
      { weekNumber: 44, year: 2024, dateRange: 'Oct 28-31, 2024' }
    ]
  }

  /**
   * Calculate the start date of an ISO week
   */
  private static getWeekStartDate(weekNumber: number, year: number): Date {
    const dateInTargetYear = new Date(year, 0, 4)
    const dateInTargetWeek = setISOWeek(dateInTargetYear, weekNumber)
    return startOfISOWeek(dateInTargetWeek)
  }

  /**
   * Calculate the end date of an ISO week (Friday)
   */
  private static getWeekEndDate(weekNumber: number, year: number): Date {
    const dateInTargetYear = new Date(year, 0, 4)
    const dateInTargetWeek = setISOWeek(dateInTargetYear, weekNumber)
    const weekEnd = endOfISOWeek(dateInTargetWeek)
    // Return Friday instead of Sunday (subtract 2 days)
    weekEnd.setDate(weekEnd.getDate() - 2)
    weekEnd.setHours(23, 59, 59, 999)
    return weekEnd
  }

  /**
   * Extract conversation excerpts from transcripts for consolidation
   */
  static extractConversationExcerpts(transcripts: MeetTranscript[]): Array<{
    meetingType: string
    participants: string[]
    keyExcerpts: string[]
    duration: string
  }> {
    return transcripts.map(transcript => {
      const participants = Array.from(new Set(
        transcript.transcriptEntries.map(entry => {
          const participantName = entry.participant.split('/').pop() || 'Unknown'
          return participantName.replace('participant_', '').replace('_', ' ')
        })
      ))

      // Extract key excerpts (longer statements that show insights)
      const keyExcerpts = transcript.transcriptEntries
        .filter(entry => entry.text.length > 100) // Longer, more substantial statements
        .slice(0, 5) // Limit to first 5 substantial excerpts
        .map(entry => entry.text)

      // Calculate duration
      const startTime = new Date(transcript.conferenceRecord.startTime)
      const endTime = new Date(transcript.conferenceRecord.endTime)
      const durationMs = endTime.getTime() - startTime.getTime()
      const durationMinutes = Math.round(durationMs / (1000 * 60))

      // Infer meeting type from participants and content
      let meetingType = 'Team Meeting'
      if (participants.length === 2) meetingType = '1:1 Meeting'
      if (transcript.transcriptEntries.some(e => e.text.toLowerCase().includes('standup'))) {
        meetingType = 'Daily Standup'
      }
      if (transcript.transcriptEntries.some(e => e.text.toLowerCase().includes('architecture'))) {
        meetingType = 'Technical Discussion'
      }

      return {
        meetingType,
        participants,
        keyExcerpts,
        duration: `${durationMinutes} minutes`
      }
    })
  }
}

// Export singleton instance for easy access
export const richIntegrationDataService = new RichIntegrationDataService()