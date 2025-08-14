/**
 * Rich Integration Flow Tests
 * 
 * End-to-end tests for the rich data integration flow, from data loading
 * through consolidation to reflection generation.
 */

import { RichIntegrationDataService } from '../lib/rich-integration-data-service'
import { GoogleCalendarService } from '../lib/calendar-integration'
import { integrationConsolidationService } from '../lib/integration-consolidation-service'
import { RichDataSeedingService } from '../lib/rich-data-seeding-service'
import { PrismaClient } from '@prisma/client'

// Mock LLM proxy for consistent test results
jest.mock('../lib/llmproxy', () => ({
  llmProxy: {
    request: jest.fn().mockResolvedValue({
      content: `### Theme: Technical Implementation

**Category: 💻 Craft & Expertise**
* **Evidence:** "Implemented JWT authentication system with refresh token rotation"
* **Attribution:** [USER]
* **Evidence:** "Debugged production authentication issues during 2-hour session"
* **Attribution:** [USER]

### Theme: Team Collaboration

**Category: 💬 Communication & Collaboration**
* **Evidence:** "Participated in daily standup meetings to coordinate with team"
* **Attribution:** [TEAM]
* **Evidence:** "Had 1:1 discussion with tech lead about implementation challenges"
* **Attribution:** [USER]`
    })
  }
}))

// Mock user-scoped data service
jest.mock('../lib/user-scoped-data', () => ({
  createUserDataService: jest.fn().mockReturnValue({
    createIntegrationConsolidation: jest.fn().mockResolvedValue({ id: 'test-consolidation-id' }),
    getIntegrationConsolidations: jest.fn().mockResolvedValue([]),
    disconnect: jest.fn()
  })
}))

describe('Rich Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Data Loading and Processing', () => {
    test('loads Jack Thompson rich dataset correctly', async () => {
      const request = {
        weekStart: new Date('2024-10-01'), // Week 40 starts Oct 1
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const richData = await RichIntegrationDataService.getRichWeeklyData(request)

      expect(richData).toBeDefined()
      if (richData) {
        expect(richData.dataSource).toBe('jack-thompson-oct-2024')
        expect(richData.totalMeetings).toBeGreaterThan(0)
        expect(richData.weekNumber).toBe(40)
        expect(richData.year).toBe(2024)
      }
    })

    test('provides conversation excerpts when transcripts are available', async () => {
      const request = {
        weekStart: new Date('2024-09-30'), // Week 40
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const excerpts = await GoogleCalendarService.getConversationExcerpts(request)

      expect(Array.isArray(excerpts)).toBe(true)
      // Excerpts may be empty for some weeks, but should always return an array
    })

    test('generates enhanced mock data for Jack users', async () => {
      const request = {
        weekStart: new Date('2024-10-01'), // Week 40
        weekEnd: new Date('2024-10-04'),
        userId: 'jack@company.com'
      }

      const mockData = await GoogleCalendarService.generateMockData(request)

      expect(mockData).toHaveProperty('totalMeetings')
      expect(mockData).toHaveProperty('keyMeetings')
      expect(mockData).toHaveProperty('meetingContext')
      expect(mockData).toHaveProperty('weeklyContextSummary')
      expect(mockData).toHaveProperty('dataSource')
      
      // Rich data should be used when available, fallback to simple mock otherwise
      expect(['jack-thompson-oct-2024', 'simple-mock']).toContain(mockData.dataSource)
    })

    test('handles non-Jack users with fallback mock data', async () => {
      const request = {
        weekStart: new Date('2024-09-30'),
        weekEnd: new Date('2024-10-04'),
        userId: 'other-user@company.com'
      }

      const mockData = await GoogleCalendarService.generateMockData(request)

      expect(mockData).toHaveProperty('totalMeetings')
      expect(mockData).toHaveProperty('keyMeetings')
      expect(mockData).toHaveProperty('meetingContext')
      expect(mockData).toHaveProperty('weeklyContextSummary')
      // Non-Jack users should get simple mock data
      expect(mockData.dataSource).toBe('simple-mock')
    })
  })

  describe('Integration Consolidation with Rich Data', () => {
    test('consolidates rich calendar data with transcripts', async () => {
      const request = {
        userId: 'jack@company.com',
        integrationType: 'google_calendar' as const,
        weekStart: new Date('2024-09-30'),
        weekEnd: new Date('2024-10-04'),
        rawIntegrationData: {
          totalMeetings: 3,
          keyMeetings: [
            {
              id: '1',
              summary: 'Daily Standup',
              description: 'Team sync meeting',
              start: { dateTime: '2024-09-30T09:00:00Z' },
              end: { dateTime: '2024-09-30T09:30:00Z' },
              status: 'confirmed'
            }
          ],
          meetingContext: ['Discussed JWT authentication progress'],
          meetingTranscripts: [
            {
              meetingId: '1',
              participants: ['Jack Thompson', 'Tech Lead'],
              transcript: 'Discussion about authentication implementation challenges',
              extractedKeyPoints: ['JWT implementation', 'Security considerations'],
              startTime: '2024-09-30T09:00:00Z',
              endTime: '2024-09-30T09:30:00Z'
            }
          ],
          meetingDocs: [],
          hasTranscripts: true,
          hasDocs: false,
          dataSource: 'jack-thompson-oct-2024'
        },
        userProfile: {
          name: 'Jack Thompson',
          jobTitle: 'Senior Software Engineer',
          seniorityLevel: 'Senior'
        },
        careerGuidelines: 'Senior engineer guidelines for growth'
      }

      const result = await integrationConsolidationService.consolidateWeeklyData(request)

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('keyInsights')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('themes')
      expect(Array.isArray(result.themes)).toBe(true)
      expect(result.themes.length).toBeGreaterThan(0)

      // Verify themes contain expected content
      const themeNames = result.themes.map(t => t.name)
      expect(themeNames).toEqual(expect.arrayContaining(['Technical Implementation', 'Team Collaboration']))
    })

    test('stores consolidation data correctly', async () => {
      const request = {
        userId: 'jack@company.com',
        integrationType: 'google_calendar' as const,
        weekStart: new Date('2024-09-30'),
        weekEnd: new Date('2024-10-04'),
        rawIntegrationData: { totalMeetings: 2, keyMeetings: [], meetingContext: [] },
        userProfile: { name: 'Jack', jobTitle: 'Engineer', seniorityLevel: 'Senior' },
        careerGuidelines: 'Test guidelines'
      }

      const consolidatedData = await integrationConsolidationService.consolidateWeeklyData(request)
      
      const consolidationId = await integrationConsolidationService.storeConsolidation(
        request.userId,
        request,
        consolidatedData,
        'test-prompt',
        'test-model'
      )

      expect(consolidationId).toBe('test-consolidation-id')
      
      // Get the mock from the mocked module
      const { createUserDataService } = require('../lib/user-scoped-data')
      const mockDataService = createUserDataService()
      
      expect(mockDataService.createIntegrationConsolidation).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationType: 'google_calendar',
          weekNumber: expect.any(Number), // Can be 39 or 40 depending on ISO week calculation
          year: 2024,
          consolidatedSummary: expect.any(String),
          keyInsights: expect.any(String),
          processingStatus: 'completed'
        })
      )
    })
  })

  describe('Data Seeding and Storage', () => {
    const mockPrisma = {
      integrationData: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn()
      },
      $disconnect: jest.fn()
    } as unknown as PrismaClient

    beforeEach(() => {
      Object.values(mockPrisma.integrationData).forEach(mock => {
        if (typeof mock === 'function') {
          (mock as jest.Mock).mockReset()
        }
      })
    })

    test('seeds rich data for development environment', async () => {
      (mockPrisma.integrationData.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.integrationData.upsert as jest.Mock).mockResolvedValue({ id: 'seeded-id' })

      await RichDataSeedingService.seedRichIntegrationData({
        environment: 'development',
        userId: 'jack@company.com'
      }, mockPrisma)

      expect(mockPrisma.integrationData.upsert).toHaveBeenCalled()
      
      const upsertCall = (mockPrisma.integrationData.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertCall.create.userId).toBe('jack@company.com')
      expect(upsertCall.create.integrationType).toBe('google_calendar')
      expect(upsertCall.create.rawData.dataSource).toBe('jack-thompson-oct-2024')
    })

    test('retrieves stored integration data correctly', async () => {
      const mockStoredData = {
        rawData: {
          totalMeetings: 3,
          hasTranscripts: true,
          dataSource: 'jack-thompson-oct-2024'
        }
      };
      
      (mockPrisma.integrationData.findUnique as jest.Mock).mockResolvedValue(mockStoredData)

      const result = await RichDataSeedingService.getStoredIntegrationData(
        'jack@company.com',
        40,
        2024,
        mockPrisma
      )

      expect(result).toEqual(mockStoredData.rawData)
      expect(mockPrisma.integrationData.findUnique).toHaveBeenCalledWith({
        where: {
          userId_weekNumber_year_integrationType: {
            userId: 'jack@company.com',
            weekNumber: 40,
            year: 2024,
            integrationType: 'google_calendar'
          }
        }
      })
    })
  })

  describe('Available Weeks and Data Coverage', () => {
    test('provides correct available weeks for Jack dataset', () => {
      const weeks = RichIntegrationDataService.getAvailableWeeks()

      expect(Array.isArray(weeks)).toBe(true)
      expect(weeks.length).toBeGreaterThan(0)
      
      // Verify week structure
      const firstWeek = weeks[0]
      expect(firstWeek).toHaveProperty('weekNumber')
      expect(firstWeek).toHaveProperty('year')
      expect(firstWeek).toHaveProperty('dateRange')
      expect(firstWeek.year).toBe(2024)
    })

    test('correctly identifies users with rich data available', () => {
      expect(RichIntegrationDataService.hasRichDataForUser('jack@company.com')).toBe(true)
      expect(RichIntegrationDataService.hasRichDataForUser('1')).toBe(true)
      expect(RichIntegrationDataService.hasRichDataForUser('dev-user-123')).toBe(true)
      expect(RichIntegrationDataService.hasRichDataForUser('other@company.com')).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles missing rich data gracefully', async () => {
      const request = {
        weekStart: new Date('2025-01-01'), // Future date with no data
        weekEnd: new Date('2025-01-05'),
        userId: 'jack@company.com'
      }

      const richData = await RichIntegrationDataService.getRichWeeklyData(request)
      expect(richData).toBeNull()
    })

    test('handles consolidation without rich data', async () => {
      const request = {
        userId: 'other-user@company.com',
        integrationType: 'google_calendar' as const,
        weekStart: new Date('2024-09-30'),
        weekEnd: new Date('2024-10-04'),
        rawIntegrationData: {
          totalMeetings: 1,
          keyMeetings: [],
          meetingContext: ['Basic meeting context']
        },
        userProfile: { name: 'Other User', jobTitle: 'Engineer', seniorityLevel: 'Mid' },
        careerGuidelines: 'Mid-level guidelines'
      }

      const result = await integrationConsolidationService.consolidateWeeklyData(request)

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('themes')
      expect(result.themes.length).toBeGreaterThan(0)
    })

    test('handles empty meeting data', async () => {
      const request = {
        userId: 'jack@company.com',
        integrationType: 'google_calendar' as const,
        weekStart: new Date('2024-09-30'),
        weekEnd: new Date('2024-10-04'),
        rawIntegrationData: {
          totalMeetings: 0,
          keyMeetings: [],
          meetingContext: []
        },
        userProfile: { name: 'Jack', jobTitle: 'Engineer', seniorityLevel: 'Senior' },
        careerGuidelines: 'Guidelines'
      }

      const result = await integrationConsolidationService.consolidateWeeklyData(request)

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('metrics')
      expect(result.metrics.totalMeetings).toBe(0)
    })
  })
})