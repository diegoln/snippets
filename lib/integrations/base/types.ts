/**
 * Base types for third-party integrations
 * 
 * Defines common interfaces and types used across all integration providers
 * including Google Calendar, Todoist, and GitHub.
 */

export interface IntegrationConfig {
  userId: string
  type: IntegrationType
  isEnabled: boolean
  useRealAPI?: boolean // For dev environment toggle
}

export type IntegrationType = 'google_calendar' | 'todoist' | 'github'

export interface IntegrationData {
  id: string
  userId: string
  integrationType: IntegrationType
  weekNumber: number
  year: number
  dataType: string
  rawData: any
  processedData?: any
  createdAt: Date
}

export interface WeeklyDataRequest {
  weekStart: Date
  weekEnd: Date
  userId: string
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
  organizer?: {
    email: string
    displayName?: string
  }
  location?: string
  status: string
  recurring?: boolean
}

export interface ProcessedCalendarData {
  totalMeetings: number
  meetingSummaries: string[]
  keyMeetings: CalendarEvent[]
  weeklyContext: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

export interface IntegrationError extends Error {
  code: string
  integration: IntegrationType
  retryable: boolean
}