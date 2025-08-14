/**
 * Integration Consolidation Tests
 * 
 * Tests the calendar integration consolidation flow
 */

import { integrationConsolidationService } from '../lib/integration-consolidation-service'
import { GoogleCalendarService } from '../lib/calendar-integration'

// Mock the LLM proxy
jest.mock('../lib/llmproxy', () => ({
  llmProxy: {
    request: jest.fn().mockResolvedValue({
      content: `### Theme: Weekly Team Collaboration

**Category: 💬 Communication & Collaboration**
* **Evidence:** "Participated in daily standup meetings to provide project updates and coordinate with team members"
  * **Attribution:** [TEAM]
* **Evidence:** "Led technical discussion in architecture review meeting for upcoming feature implementation"
  * **Attribution:** [USER]

### Theme: Technical Implementation

**Category: 💻 Craft & Expertise**
* **Evidence:** "Designed and implemented JWT authentication system with refresh token rotation"
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

describe('Integration Consolidation Service', () => {
  const mockRequest = {
    userId: 'test-user',
    integrationType: 'google_calendar' as const,
    weekStart: new Date('2024-01-01'),
    weekEnd: new Date('2024-01-05'),
    rawIntegrationData: {
      totalMeetings: 5,
      keyMeetings: [
        {
          id: '1',
          summary: 'Daily Standup',
          description: 'Team sync meeting',
          start: { dateTime: '2024-01-01T09:00:00Z' },
          end: { dateTime: '2024-01-01T09:30:00Z' },
          status: 'confirmed'
        }
      ],
      meetingContext: ['Daily standup discussion about current sprint progress']
    },
    userProfile: {
      name: 'Test User',
      jobTitle: 'Software Engineer',
      seniorityLevel: 'Senior'
    },
    careerGuidelines: 'Test career guidelines'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Calendar Consolidation', () => {
    test('should consolidate calendar data successfully', async () => {
      const result = await integrationConsolidationService.consolidateWeeklyData(mockRequest)

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('keyInsights')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('themes')
      expect(Array.isArray(result.themes)).toBe(true)
      expect(result.themes.length).toBeGreaterThan(0)
    })

    test('should parse themes correctly from LLM response', async () => {
      const result = await integrationConsolidationService.consolidateWeeklyData(mockRequest)

      expect(result.themes).toHaveLength(2)
      expect(result.themes[0].name).toBe('Weekly Team Collaboration')
      expect(result.themes[1].name).toBe('Technical Implementation')
      
      // Check categories
      expect(result.themes[0].categories).toHaveLength(1)
      expect(result.themes[0].categories[0].name).toBe('💬 Communication & Collaboration')
      expect(result.themes[0].categories[0].evidence).toHaveLength(2)
    })

    test('should calculate meeting hours correctly', async () => {
      const result = await integrationConsolidationService.consolidateWeeklyData(mockRequest)

      expect(result.metrics).toHaveProperty('totalMeetings', 5)
      expect(result.metrics).toHaveProperty('meetingHours')
      expect(result.metrics.meetingHours).toBeGreaterThanOrEqual(0)
    })

    test('should handle empty calendar data', async () => {
      const emptyRequest = {
        ...mockRequest,
        rawIntegrationData: {
          totalMeetings: 0,
          keyMeetings: [],
          meetingContext: []
        }
      }

      const result = await integrationConsolidationService.consolidateWeeklyData(emptyRequest)

      expect(result).toHaveProperty('summary')
      expect(result.metrics.totalMeetings).toBe(0)
    })

    test('should store consolidation data', async () => {
      const consolidatedData = await integrationConsolidationService.consolidateWeeklyData(mockRequest)
      
      const consolidationId = await integrationConsolidationService.storeConsolidation(
        mockRequest.userId,
        mockRequest,
        consolidatedData,
        'test-prompt',
        'test-model'
      )

      expect(consolidationId).toBe('test-consolidation-id')
    })
  })

  describe('Error Handling', () => {
    test('should throw error when LLM fails', async () => {
      // Mock LLM failure
      const { llmProxy } = require('../lib/llmproxy')
      llmProxy.request.mockRejectedValueOnce(new Error('LLM service unavailable'))

      await expect(integrationConsolidationService.consolidateWeeklyData(mockRequest))
        .rejects
        .toThrow('Calendar consolidation failed')
    })
  })

  describe('Integration with Mock Calendar Data', () => {
    test('should work with GoogleCalendarService mock data', async () => {
      const mockCalendarData = await GoogleCalendarService.generateMockData({
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-05'),
        userId: 'test-user'
      })

      expect(mockCalendarData).toHaveProperty('totalMeetings')
      expect(mockCalendarData).toHaveProperty('keyMeetings')
      expect(mockCalendarData).toHaveProperty('meetingContext')
      expect(Array.isArray(mockCalendarData.keyMeetings)).toBe(true)
    })
  })
})