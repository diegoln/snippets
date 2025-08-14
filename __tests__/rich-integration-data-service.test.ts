/**
 * Rich Integration Data Service Tests
 * 
 * Tests for loading and processing Jack Thompson's rich mock dataset
 */

import { RichIntegrationDataService } from '../lib/rich-integration-data-service'

// Mock the private methods to avoid actual file system calls
const mockLoadCalendarEvents = jest.fn()
const mockLoadWeekTranscripts = jest.fn()
const mockLoadWeekDocs = jest.fn()

// Spy on private methods
jest.spyOn(RichIntegrationDataService as any, 'loadCalendarEvents').mockImplementation(mockLoadCalendarEvents)
jest.spyOn(RichIntegrationDataService as any, 'loadWeekTranscripts').mockImplementation(mockLoadWeekTranscripts)
jest.spyOn(RichIntegrationDataService as any, 'loadWeekDocs').mockImplementation(mockLoadWeekDocs)

// Sample test data
const mockCalendarEvents = [
  {
    id: 'cal_001',
    summary: 'Daily Standup - Identity Platform Team',
    description: null,
    start: { dateTime: '2024-10-01T09:00:00-07:00' },
    end: { dateTime: '2024-10-01T09:15:00-07:00' },
    attendees: [
      { email: 'jack@company.com', displayName: 'Jack Thompson' },
      { email: 'sarah@company.com', displayName: 'Sarah Chen' }
    ],
    organizer: { email: 'sarah@company.com', displayName: 'Sarah Chen' },
    status: 'confirmed'
  },
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
]

const mockTranscript = {
  conferenceRecord: {
    name: 'conferenceRecords/meet-1on1-sarah-jack-weekly',
    startTime: '2024-10-01T21:01:23.456Z',
    endTime: '2024-10-01T21:29:15.789Z',
    space: {
      name: 'spaces/klm-nopq-rst',
      meetingUri: 'https://meet.google.com/klm-nopq-rst'
    }
  },
  transcript: {
    name: 'conferenceRecords/meet-1on1-sarah-jack-weekly/transcripts/transcript_001',
    state: 'ENDED',
    startTime: '2024-10-01T21:01:23.456Z',
    endTime: '2024-10-01T21:29:15.789Z'
  },
  transcriptEntries: [
    {
      name: 'entry_001',
      participant: 'participant_sarah_chen',
      text: 'Hey Jack, how are you doing? How was your first day back after the weekend?',
      languageCode: 'en-US',
      startTime: '2024-10-01T21:01:25.123Z',
      endTime: '2024-10-01T21:01:29.456Z'
    },
    {
      name: 'entry_002',
      participant: 'participant_jack_thompson',
      text: 'Good, good. Yeah, feeling refreshed. Ready to dive into this authentication work.',
      languageCode: 'en-US',
      startTime: '2024-10-01T21:01:30.789Z',
      endTime: '2024-10-01T21:01:35.123Z'
    }
  ]
}

const mockMeetingDoc = {
  kind: 'docs#document',
  documentId: '1J4cK_1oN1_S4r4H_0cT01_2024_mEeTiNgNoTeS',
  title: 'Meeting Notes - 1:1 Sarah & Jack - Oct 1, 2024',
  body: {
    content: [
      {
        startIndex: 1,
        endIndex: 12,
        paragraph: {
          elements: [
            {
              startIndex: 1,
              endIndex: 11,
              textRun: {
                content: 'Meeting Notes\n',
                textStyle: { bold: true }
              }
            }
          ]
        }
      }
    ]
  }
}

describe('RichIntegrationDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mock implementations
    mockLoadCalendarEvents.mockResolvedValue(mockCalendarEvents)
    mockLoadWeekTranscripts.mockResolvedValue([mockTranscript])
    mockLoadWeekDocs.mockResolvedValue([mockMeetingDoc])
  })

  describe('User Detection', () => {
    test('identifies users with rich data correctly', () => {
      expect(RichIntegrationDataService.hasRichDataForUser('jack@company.com')).toBe(true)
      expect(RichIntegrationDataService.hasRichDataForUser('jack@example.com')).toBe(true)
      expect(RichIntegrationDataService.hasRichDataForUser('1')).toBe(true)
      expect(RichIntegrationDataService.hasRichDataForUser('dev-user-123')).toBe(true)
    })

    test('rejects users without rich data', () => {
      expect(RichIntegrationDataService.hasRichDataForUser('sarah@example.com')).toBe(false)
      expect(RichIntegrationDataService.hasRichDataForUser('other@company.com')).toBe(false)
      expect(RichIntegrationDataService.hasRichDataForUser('2')).toBe(false)
    })
  })

  describe('Data Loading', () => {
    test('returns null for users without rich data', async () => {
      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-05'),
        userId: 'sarah@example.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)
      expect(result).toBeNull()
    })

    test('returns null for weeks outside dataset range', async () => {
      const request = {
        weekStart: new Date('2024-09-01'), // Week 35, outside range
        weekEnd: new Date('2024-09-05'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)
      expect(result).toBeNull()
    })

    test('loads rich data for users in valid week range', async () => {
      // Data already set up in beforeEach

      const request = {
        weekStart: new Date('2024-10-01'), // Tuesday of week 40 
        weekEnd: new Date('2024-10-04'),   // Friday of week 40
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)

      expect(result).not.toBeNull()
      expect(result?.weekNumber).toBe(40)
      expect(result?.year).toBe(2024)
      expect(result?.dataSource).toBe('jack-thompson-oct-2024')
      expect(result?.hasTranscripts).toBe(true)
      expect(result?.hasDocs).toBe(true)
      expect(result?.totalMeetings).toBe(2)
    })

    test('handles missing files gracefully', async () => {
      // Mock loading errors
      mockLoadCalendarEvents.mockRejectedValue(new Error('File not found'))

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)
      expect(result).toBeNull()
    })
  })

  describe('Week Filtering', () => {
    test('filters events by correct ISO week', async () => {
      // Events from different weeks
      const mixedWeekEvents = [
        {
          ...mockCalendarEvents[0],
          start: { dateTime: '2024-10-01T09:00:00-07:00' } // Week 40
        },
        {
          ...mockCalendarEvents[1],
          start: { dateTime: '2024-10-08T14:00:00-07:00' } // Week 41
        }
      ]

      // Override mock with mixed week events
      mockLoadCalendarEvents.mockResolvedValue(mixedWeekEvents)
      mockLoadWeekTranscripts.mockResolvedValue([])
      mockLoadWeekDocs.mockResolvedValue([])

      const request = {
        weekStart: new Date('2024-10-01'), // Week 40
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)

      expect(result?.totalMeetings).toBe(1) // Only week 40 event (Daily Standup)
      expect(result?.keyMeetings).toHaveLength(0) // Daily Standup is not career-relevant
      expect(result?.weeklyContextSummary).toContain('1 meetings')
    })
  })

  describe('Career-Relevant Meeting Detection', () => {
    test('identifies 1:1 meetings as career-relevant', async () => {
      // Default mocks already set up with 1:1 meeting
      mockLoadWeekTranscripts.mockResolvedValue([])
      mockLoadWeekDocs.mockResolvedValue([])

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)

      const careerRelevantMeeting = result?.keyMeetings.find(m => 
        m.summary.includes('1:1')
      )
      expect(careerRelevantMeeting).toBeDefined()
    })

    test('identifies architecture meetings as career-relevant', async () => {
      const architectureEvent = {
        ...mockCalendarEvents[0],
        summary: 'Architecture Review - JWT System'
      }

      mockLoadCalendarEvents.mockResolvedValue([architectureEvent])
      mockLoadWeekTranscripts.mockResolvedValue([])
      mockLoadWeekDocs.mockResolvedValue([])

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)

      expect(result?.keyMeetings).toHaveLength(1)
      expect(result?.keyMeetings[0].summary).toContain('Architecture')
    })
  })

  describe('Weekly Summary Generation', () => {
    test('generates summary with transcript and doc indicators', async () => {
      // Default mocks already include transcripts and docs

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)

      expect(result?.weeklyContextSummary).toContain('Meeting transcripts available')
      expect(result?.weeklyContextSummary).toContain('Meeting notes documented')
      expect(result?.weeklyContextSummary).toContain('1:1 meeting(s)')
    })
  })

  describe('Conversation Excerpts Extraction', () => {
    test('extracts key conversation excerpts from transcripts', () => {
      const excerpts = RichIntegrationDataService.extractConversationExcerpts([mockTranscript])

      expect(excerpts).toHaveLength(1)
      expect(excerpts[0].participants).toContain('sarah chen')
      expect(excerpts[0].participants).toContain('jack thompson')
      expect(excerpts[0].meetingType).toBe('1:1 Meeting')
      expect(excerpts[0].duration).toContain('minutes')
    })

    test('handles empty transcript entries', () => {
      const emptyTranscript = {
        ...mockTranscript,
        transcriptEntries: []
      }

      const excerpts = RichIntegrationDataService.extractConversationExcerpts([emptyTranscript])

      expect(excerpts).toHaveLength(1)
      expect(excerpts[0].keyExcerpts).toHaveLength(0)
    })
  })

  describe('Available Weeks', () => {
    test('returns correct week range for dataset', () => {
      const weeks = RichIntegrationDataService.getAvailableWeeks()

      expect(weeks).toHaveLength(5)
      expect(weeks[0]).toEqual({
        weekNumber: 40,
        year: 2024,
        dateRange: 'Oct 1-4, 2024'
      })
      expect(weeks[4]).toEqual({
        weekNumber: 44,
        year: 2024,
        dateRange: 'Oct 28-31, 2024'
      })
    })
  })

  describe('Meeting Context Generation', () => {
    test('adds transcript availability indicators to meeting context', async () => {
      // Default mocks include transcripts
      mockLoadWeekDocs.mockResolvedValue([])

      const request = {
        weekStart: new Date('2024-10-01'),
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const result = await RichIntegrationDataService.getRichWeeklyData(request)

      // Should have transcript indicator for meetings with transcripts
      const contextWithTranscript = result?.meetingContext.find(context =>
        context.includes('[Transcript Available]')
      )
      expect(contextWithTranscript).toBeDefined()
    })
  })
})

describe('RichIntegrationDataService Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('handles malformed JSON files gracefully', async () => {
    mockLoadCalendarEvents.mockRejectedValue(new SyntaxError('Unexpected token'))

    const request = {
      weekStart: new Date('2024-10-01'),
      weekEnd: new Date('2024-10-04'),
      userId: 'jack@company.com'
    }

    const result = await RichIntegrationDataService.getRichWeeklyData(request)
    expect(result).toBeNull()
  })

  test('continues processing when individual transcript files fail', async () => {
    mockLoadCalendarEvents.mockResolvedValue(mockCalendarEvents)
    mockLoadWeekTranscripts.mockRejectedValue(new Error('Transcript file corrupted'))
    mockLoadWeekDocs.mockResolvedValue([])

    const request = {
      weekStart: new Date('2024-10-01'),
      weekEnd: new Date('2024-10-04'),
      userId: 'jack@company.com'
    }

    const result = await RichIntegrationDataService.getRichWeeklyData(request)

    // Should still return data with empty transcripts
    expect(result).not.toBeNull()
    expect(result?.hasTranscripts).toBe(false)
    expect(result?.meetingTranscripts).toHaveLength(0)
  })
})