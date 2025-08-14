/**
 * SIMPLIFIED: Integration Edge Cases Test Suite
 * 
 * These tests ensure the system gracefully handles scenarios where:
 * 1. Calendar integration succeeds but returns no data
 * 2. Calendar integration fails completely
 * 3. Partial data is available (e.g., only 1 meeting)
 * 
 * PRINCIPLE: The system should NEVER generate fake data to compensate.
 * Better to show "no data available" than to create false reflections.
 * 
 * Focus: Service layer testing, not API route testing.
 */

import { integrationConsolidationService } from '../lib/integration-consolidation-service'
import { GoogleCalendarService } from '../lib/calendar-integration'

// Mock the LLM proxy at the module level to prevent real API calls
jest.mock('../lib/llmproxy', () => ({
  llmProxy: {
    request: jest.fn()
  }
}))

// Mock the user data service to prevent database calls
jest.mock('../lib/user-scoped-data', () => ({
  createUserDataService: jest.fn(() => ({
    createIntegrationConsolidation: jest.fn().mockResolvedValue({
      id: 'test-consolidation-id',
      userId: 'test-user',
      consolidatedData: {}
    }),
    disconnect: jest.fn().mockResolvedValue(void 0)
  }))
}))

// Import after mocking
import { llmProxy } from '../lib/llmproxy'

// Skip LLM tests in CI without API key
const skipLLMTests = !process.env.GEMINI_API_KEY && process.env.CI

describe('Integration Edge Cases (Simplified)', () => {
  let llmProxySpy: jest.MockedFunction<typeof llmProxy.request>
  
  beforeAll(() => {
    if (skipLLMTests) {
      console.log('⏭️  Skipping LLM tests - no GEMINI_API_KEY in CI environment')
    }
  })
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Get reference to the mocked LLM proxy
    llmProxySpy = llmProxy.request as jest.MockedFunction<typeof llmProxy.request>
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /**
   * SCENARIO 1: Empty Calendar Week
   * 
   * User successfully connects their calendar, but they had no meetings
   * last week (e.g., they were on vacation, holiday week, or just no meetings).
   * 
   * EXPECTED BEHAVIOR:
   * - Integration should still process the empty data
   * - LLM should be called to generate appropriate response for no meetings
   * - System should handle this gracefully
   */
  describe('Empty Calendar Data', () => {
    it('should handle empty calendar data gracefully', async () => {
      if (skipLLMTests) {
        console.log('⏭️  Skipping - no GEMINI_API_KEY in CI environment')
        return
      }

      // Arrange - Empty calendar data
      const emptyCalendarData = {
        totalMeetings: 0,
        meetingContext: [],
        keyMeetings: [],
        weeklyContextSummary: 'No meetings this week'
      }
      
      // Mock LLM response for empty data scenario
      llmProxySpy.mockResolvedValue({
        content: '### Theme: Planning Time\n**Category: Work-Life Balance**\n- Evidence: Had a meeting-free week for focused work\n',
        model: 'test-model',
        usage: { tokens: 50 }
      })
      
      // Act - Process empty calendar data
      const result = await integrationConsolidationService.consolidateWeeklyData({
        userId: 'test-user',
        integrationType: 'google_calendar',
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        rawIntegrationData: emptyCalendarData,
        userProfile: { 
          name: 'Test User',
          jobTitle: 'engineer', 
          seniorityLevel: 'senior' 
        },
        careerGuidelines: 'test guidelines'
      })
      
      // Assert - Verify system handled empty data properly
      expect(llmProxySpy).toHaveBeenCalledTimes(1)
      expect(result).toBeDefined()
      expect(result.themes).toBeDefined()
      
      console.log('✅ Empty calendar data handled gracefully')
    })
  })

  /**
   * SCENARIO 2: Minimal Calendar Data
   * 
   * User has very limited meeting data (e.g., just 1 brief meeting).
   * System should still process this and not fabricate additional data.
   */
  describe('Minimal Calendar Data', () => {
    it('should process single meeting without fabricating data', async () => {
      if (skipLLMTests) {
        console.log('⏭️  Skipping - no GEMINI_API_KEY in CI environment')
        return
      }

      // Arrange - Minimal calendar data (1 meeting)
      const minimalCalendarData = {
        totalMeetings: 1,
        keyMeetings: [
          { 
            summary: 'Quick Standup', 
            description: 'Brief team check-in',
            start: { dateTime: '2024-01-01T09:00:00Z' },
            end: { dateTime: '2024-01-01T09:15:00Z' }
          }
        ],
        meetingContext: ['Brief team standup'],
        weeklyContextSummary: 'Light meeting week with one standup'
      }
      
      // Mock LLM response for minimal data
      llmProxySpy.mockResolvedValue({
        content: '### Theme: Team Communication\n**Category: Collaboration**\n- Evidence: Participated in team standup\n',
        model: 'test-model',
        usage: { tokens: 75 }
      })
      
      // Act
      const result = await integrationConsolidationService.consolidateWeeklyData({
        userId: 'test-user',
        integrationType: 'google_calendar',
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        rawIntegrationData: minimalCalendarData,
        userProfile: { 
          name: 'Test User',
          jobTitle: 'engineer', 
          seniorityLevel: 'senior' 
        },
        careerGuidelines: 'test guidelines'
      })
      
      // Assert - Verify the LLM prompt contains only the real meeting data
      expect(llmProxySpy).toHaveBeenCalledTimes(1)
      const llmCall = llmProxySpy.mock.calls[0][0]
      
      expect(llmCall.prompt).toContain('Quick Standup')
      expect(llmCall.prompt).toContain('Brief team check-in')
      // Should NOT contain fabricated meetings
      expect(llmCall.prompt).not.toContain('Review session')
      expect(llmCall.prompt).not.toContain('Planning meeting')
      
      console.log('✅ Minimal data processed without fabrication')
    })
  })

  /**
   * SCENARIO 3: LLM Service Failure
   * 
   * Calendar data is available, but LLM service fails.
   * System should fail gracefully and not provide fake consolidation.
   */
  describe('LLM Service Failure', () => {
    it('should fail gracefully when LLM service is unavailable', async () => {
      if (skipLLMTests) {
        console.log('⏭️  Skipping - no GEMINI_API_KEY in CI environment')
        return
      }

      // Arrange - Valid calendar data but LLM failure
      const validCalendarData = GoogleCalendarService.generateMockData({
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        userId: 'test-user'
      })
      
      // Mock LLM service failure
      llmProxySpy.mockRejectedValue(new Error('Gemini API rate limit exceeded'))
      
      // Act & Assert - Should throw, not return fake consolidation
      await expect(
        integrationConsolidationService.consolidateWeeklyData({
          userId: 'test-user',
          integrationType: 'google_calendar',
          weekStart: new Date('2024-01-01'),
          weekEnd: new Date('2024-01-07'),
          rawIntegrationData: validCalendarData,
          userProfile: { 
            name: 'Test User',
            jobTitle: 'engineer', 
            seniorityLevel: 'senior' 
          },
          careerGuidelines: 'test guidelines'
        })
      ).rejects.toThrow('Calendar consolidation failed')
      
      // Verify it attempted to call LLM
      expect(llmProxySpy).toHaveBeenCalledTimes(1)
      
      console.log('✅ System fails gracefully when LLM unavailable')
    })
  })

  /**
   * SCENARIO 4: Calendar Service Generates Valid Mock Data
   * 
   * Verify that our mock calendar generation doesn't create unrealistic data
   * that could mislead users about their actual productivity.
   */
  describe('Mock Data Quality', () => {
    it('should generate realistic mock calendar data', async () => {
      // Arrange & Act
      const mockData = await GoogleCalendarService.generateMockData({
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        userId: 'test-user'
      })
      
      // Assert - Mock data should be realistic
      expect(mockData.totalMeetings).toBeGreaterThan(0)
      expect(mockData.totalMeetings).toBeLessThan(20) // Reasonable upper bound
      expect(mockData.keyMeetings.length).toBeGreaterThan(0) // Should have some meetings
      expect(mockData.keyMeetings.length).toBeLessThanOrEqual(mockData.totalMeetings) // Key meetings subset of total
      expect(mockData.meetingContext).toBeDefined()
      expect(mockData.weeklyContextSummary).toBeDefined()
      
      // Each meeting should have realistic structure
      mockData.keyMeetings.forEach(meeting => {
        expect(meeting.summary).toBeDefined()
        expect(meeting.summary.length).toBeGreaterThan(5) // Not just single words
        expect(meeting.start).toBeDefined()
        expect(meeting.end).toBeDefined()
      })
      
      console.log('✅ Mock calendar data is realistic:', {
        totalMeetings: mockData.totalMeetings,
        hasContext: mockData.meetingContext.length > 0,
        hasSummary: mockData.weeklyContextSummary.length > 0
      })
    })
  })
})