/**
 * Enhanced Calendar Integration Tests
 * 
 * Tests for the updated calendar integration with rich data support
 */

import { GoogleCalendarService } from '../lib/calendar-integration'

// Mock the rich integration data service
jest.mock('../lib/rich-integration-data-service', () => ({
  RichIntegrationDataService: {
    isJackUser: jest.fn(),
    getRichWeeklyData: jest.fn(),
    extractConversationExcerpts: jest.fn()
  }
}))

import { RichIntegrationDataService } from '../lib/rich-integration-data-service'

const mockRichIntegrationDataService = RichIntegrationDataService as jest.Mocked<typeof RichIntegrationDataService>

// Sample rich data
const mockRichData = {
  totalMeetings: 2,
  meetingContext: [
    'Tuesday, Oct 1: Daily Standup - Identity Platform Team (2 attendees)',
    'Tuesday, Oct 1: 1:1 with Sarah - Performance Discussion (2 attendees) [Transcript Available]'
  ],
  keyMeetings: [
    {
      id: 'cal_002',
      summary: '1:1 with Sarah - Performance Discussion',
      description: 'Weekly check-in',
      start: { dateTime: '2024-10-01T14:00:00-07:00' },
      end: { dateTime: '2024-10-01T14:30:00-07:00' },
      attendees: [
        { email: 'jack@company.com', displayName: 'Jack Thompson' },
        { email: 'sarah@company.com', displayName: 'Sarah Chen' }
      ],
      organizer: { email: 'sarah@company.com', displayName: 'Sarah Chen' },
      status: 'confirmed'
    }
  ],
  weeklyContextSummary: 'This week included 2 meetings. Had 1 1:1 meeting(s) for development discussions.',
  meetingTranscripts: [
    {
      conferenceRecord: {
        name: 'test-conference',
        startTime: '2024-10-01T21:01:23.456Z',
        endTime: '2024-10-01T21:29:15.789Z'
      },
      transcript: {
        name: 'test-transcript',
        state: 'ENDED'
      },
      transcriptEntries: []
    }
  ],
  meetingDocs: [],
  hasTranscripts: true,
  hasDocs: false,
  weekNumber: 40,
  year: 2024,
  dataSource: 'jack-thompson-oct-2024'
}

describe('Enhanced Calendar Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateMockData with Rich Data', () => {
    test('returns rich data for Jack user', async () => {
      mockRichIntegrationDataService.isJackUser.mockReturnValue(true)
      mockRichIntegrationDataService.getRichWeeklyData.mockResolvedValue(mockRichData)

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await GoogleCalendarService.generateMockData(request)

      expect(result.totalMeetings).toBe(2)
      expect(result.hasTranscripts).toBe(true)
      expect(result.hasDocs).toBe(false)
      expect(result.dataSource).toBe('jack-thompson-oct-2024')
      expect(result.weekNumber).toBe(40)
      expect(result.year).toBe(2024)
    })

    test('falls back to simple mock data for non-Jack users', async () => {
      mockRichIntegrationDataService.isJackUser.mockReturnValue(false)

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'sarah@example.com'
      }

      const result = await GoogleCalendarService.generateMockData(request)

      expect(result.totalMeetings).toBe(2)
      expect(result.hasTranscripts).toBe(false)
      expect(result.hasDocs).toBe(false)
      expect(result.dataSource).toBe('simple-mock')
      expect(result.weeklyContextSummary).toContain('2 meetings')
    })

    test('falls back to simple mock data when rich data fails', async () => {
      mockRichIntegrationDataService.isJackUser.mockReturnValue(true)
      mockRichIntegrationDataService.getRichWeeklyData.mockResolvedValue(null)

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await GoogleCalendarService.generateMockData(request)

      expect(result.totalMeetings).toBe(2)
      expect(result.hasTranscripts).toBe(false)
      expect(result.dataSource).toBe('simple-mock')
    })
  })

  describe('getConversationExcerpts', () => {
    test('returns conversation excerpts for Jack user with transcripts', async () => {
      mockRichIntegrationDataService.isJackUser.mockReturnValue(true)
      mockRichIntegrationDataService.getRichWeeklyData.mockResolvedValue(mockRichData)
      mockRichIntegrationDataService.extractConversationExcerpts.mockReturnValue([
        {
          meetingType: '1:1 Meeting',
          participants: ['Sarah Chen', 'Jack Thompson'],
          keyExcerpts: ['This is a test excerpt'],
          duration: '27 minutes'
        }
      ])

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const excerpts = await GoogleCalendarService.getConversationExcerpts(request)

      expect(excerpts).toHaveLength(1)
      expect(excerpts[0].meetingType).toBe('1:1 Meeting')
      expect(excerpts[0].participants).toContain('Jack Thompson')
    })

    test('returns empty array for non-Jack users', async () => {
      mockRichIntegrationDataService.isJackUser.mockReturnValue(false)

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'sarah@example.com'
      }

      const excerpts = await GoogleCalendarService.getConversationExcerpts(request)

      expect(excerpts).toHaveLength(0)
    })

    test('returns empty array when no transcripts available', async () => {
      const dataWithoutTranscripts = {
        ...mockRichData,
        hasTranscripts: false,
        meetingTranscripts: []
      }

      mockRichIntegrationDataService.isJackUser.mockReturnValue(true)
      mockRichIntegrationDataService.getRichWeeklyData.mockResolvedValue(dataWithoutTranscripts)

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const excerpts = await GoogleCalendarService.getConversationExcerpts(request)

      expect(excerpts).toHaveLength(0)
    })
  })

  describe('Backwards Compatibility', () => {
    test('enhanced data includes all original WeeklyCalendarData fields', async () => {
      mockRichIntegrationDataService.isJackUser.mockReturnValue(true)
      mockRichIntegrationDataService.getRichWeeklyData.mockResolvedValue(mockRichData)

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await GoogleCalendarService.generateMockData(request)

      // Original WeeklyCalendarData fields
      expect(result.totalMeetings).toBeDefined()
      expect(result.meetingContext).toBeDefined()
      expect(result.keyMeetings).toBeDefined()
      expect(result.weeklyContextSummary).toBeDefined()

      // Enhanced fields
      expect(result.hasTranscripts).toBeDefined()
      expect(result.hasDocs).toBeDefined()
      expect(result.dataSource).toBeDefined()
    })
  })
})