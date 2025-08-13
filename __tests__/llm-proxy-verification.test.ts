/**
 * SIMPLIFIED: LLM Proxy Verification Tests
 * 
 * These tests ensure that our integration consolidation service
 * properly uses the LLM proxy for processing calendar data.
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

describe('LLM Proxy Integration Tests (Simplified)', () => {
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
   * TEST: Consolidation service calls LLM proxy
   */
  it('should call LLM proxy for calendar data consolidation', async () => {
    if (skipLLMTests) {
      console.log('⏭️  Skipping - no GEMINI_API_KEY in CI environment')
      return
    }

    // Arrange - Get mock calendar data
    const mockCalendarData = GoogleCalendarService.generateMockData({
      weekStart: new Date('2024-01-01'),
      weekEnd: new Date('2024-01-07'),
      userId: 'test-user'
    })
    
    // Mock the LLM response
    llmProxySpy.mockResolvedValue({
      content: '### Theme: Technical Leadership\n**Category: Code Reviews**\n- Evidence: Led code review session\n',
      model: 'test-model',
      usage: { tokens: 100 }
    })
    
    // Act - Trigger consolidation
    await integrationConsolidationService.consolidateWeeklyData({
      userId: 'test-user',
      integrationType: 'google_calendar',
      weekStart: new Date('2024-01-01'),
      weekEnd: new Date('2024-01-07'),
      rawIntegrationData: mockCalendarData,
      userProfile: { 
        name: 'Test User',
        jobTitle: 'engineer', 
        seniorityLevel: 'senior' 
      },
      careerGuidelines: 'test guidelines'
    })
    
    // Assert - Verify LLM was called for consolidation
    expect(llmProxySpy).toHaveBeenCalledTimes(1)
    expect(llmProxySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.any(String),
        temperature: expect.any(Number),
        maxTokens: expect.any(Number)
      })
    )
    
    console.log('✅ Consolidation LLM call verified')
  })

  /**
   * TEST: Service fails properly when LLM unavailable
   */
  it('should fail if LLM proxy is not available, not fall back to mocks', async () => {
    if (skipLLMTests) {
      console.log('⏭️  Skipping - no GEMINI_API_KEY in CI environment')
      return
    }

    // Arrange - Mock LLM failure
    llmProxySpy.mockRejectedValue(new Error('LLM service unavailable'))
    
    const mockCalendarData = GoogleCalendarService.generateMockData({
      weekStart: new Date('2024-01-01'),
      weekEnd: new Date('2024-01-07'),
      userId: 'test-user'
    })
    
    // Act & Assert - Should throw, not return mock data
    await expect(
      integrationConsolidationService.consolidateWeeklyData({
        userId: 'test-user',
        integrationType: 'google_calendar',
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        rawIntegrationData: mockCalendarData,
        userProfile: { 
          name: 'Test User',
          jobTitle: 'engineer', 
          seniorityLevel: 'senior' 
        },
        careerGuidelines: 'test guidelines'
      })
    ).rejects.toThrow('Calendar consolidation failed')
    
    // Verify it actually tried to call LLM
    expect(llmProxySpy).toHaveBeenCalledTimes(1)
    
    console.log('✅ System correctly fails when LLM unavailable - no mock fallback')
  })

  /**
   * TEST: LLM request contains calendar data
   */
  it('should include calendar meeting data in LLM prompt', async () => {
    if (skipLLMTests) {
      console.log('⏭️  Skipping - no GEMINI_API_KEY in CI environment')
      return
    }

    // Arrange - Calendar data with specific content
    const mockCalendarData = {
      totalMeetings: 2,
      keyMeetings: [
        { 
          summary: 'Sprint Planning Session', 
          description: 'Q1 roadmap planning',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' }
        }
      ],
      meetingContext: ['Planned Q1 features and timeline'],
      weeklyContextSummary: 'Focus on planning and execution'
    }
    
    // Mock LLM response
    llmProxySpy.mockResolvedValue({
      content: '### Theme: Planning\n**Category: Project Management**\n- Evidence: Led sprint planning\n',
      model: 'test-model'
    })
    
    // Act
    await integrationConsolidationService.consolidateWeeklyData({
      userId: 'test-user',
      integrationType: 'google_calendar',
      weekStart: new Date('2024-01-01'),
      weekEnd: new Date('2024-01-07'),
      rawIntegrationData: mockCalendarData,
      userProfile: { 
        name: 'Test User',
        jobTitle: 'engineer', 
        seniorityLevel: 'senior' 
      },
      careerGuidelines: 'test guidelines'
    })
    
    // Assert - Verify calendar data is in the prompt
    expect(llmProxySpy).toHaveBeenCalledTimes(1)
    const llmCall = llmProxySpy.mock.calls[0][0]
    
    expect(llmCall.prompt).toContain('Sprint Planning Session')
    expect(llmCall.prompt).toContain('Q1 roadmap planning')
    expect(llmCall.prompt).toContain('Planned Q1 features')
    
    console.log('✅ Calendar data properly included in LLM prompt')
  })
})