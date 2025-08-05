/**
 * Tests for Career Guidelines Handler
 * 
 * Verifies the job processor handler properly passes context between levels
 */

import { CareerGuidelinesHandler } from '../career-guidelines-handler'
import { llmProxy } from '../../../llmproxy'
import { JobContext } from '../../types'

jest.mock('../../../llmproxy')

describe('CareerGuidelinesHandler', () => {
  let handler: CareerGuidelinesHandler
  let mockContext: JobContext

  beforeEach(() => {
    handler = new CareerGuidelinesHandler()
    mockContext = {
      jobId: 'test-job-123',
      userId: 'test-user-456',
      updateProgress: jest.fn().mockResolvedValue(undefined),
      log: jest.fn()
    }
    jest.clearAllMocks()
  })

  it('should pass current level guidelines as context to next level', async () => {
    const currentGuidelines = `#### Impact & Ownership
* Owns team-level initiatives
* Delivers complex projects independently`

    const nextGuidelines = `#### Impact & Ownership  
* Leads cross-team strategic initiatives
* Influences organizational direction`

    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn()
      .mockResolvedValueOnce({ content: currentGuidelines })
      .mockResolvedValueOnce({ content: nextGuidelines })

    const input = {
      role: 'Engineering Manager',
      level: 'Senior',
      companyLadder: 'Tech leadership ladder'
    }

    const result = await handler.process(input, mockContext)

    // Verify progress updates
    expect(mockContext.updateProgress).toHaveBeenCalledWith(10, 'Starting career guidelines generation...')
    expect(mockContext.updateProgress).toHaveBeenCalledWith(20, 'Analyzing expectations for Senior Engineering Manager...')
    expect(mockContext.updateProgress).toHaveBeenCalledWith(50, 'Current level analysis complete...')
    expect(mockContext.updateProgress).toHaveBeenCalledWith(60, 'Analyzing next level expectations for Staff...')
    expect(mockContext.updateProgress).toHaveBeenCalledWith(90, 'Finalizing career guidelines...')
    expect(mockContext.updateProgress).toHaveBeenCalledWith(100, 'Career guidelines generation complete!')

    // Verify LLM calls
    expect(llmProxyMock.request).toHaveBeenCalledTimes(2)

    // First call - current level
    const firstCall = (llmProxyMock.request as jest.Mock).mock.calls[0][0]
    expect(firstCall.context).toMatchObject({
      role: 'Engineering Manager',
      level: 'Senior',
      companyLadder: 'Tech leadership ladder',
      targetLevel: 'current'
    })

    // Second call - next level with context
    const secondCall = (llmProxyMock.request as jest.Mock).mock.calls[1][0]
    expect(secondCall.context).toMatchObject({
      role: 'Engineering Manager',
      level: 'Staff',
      companyLadder: 'Tech leadership ladder',
      targetLevel: 'next',
      currentLevelGuidelines: currentGuidelines
    })

    // Verify result
    expect(result).toMatchObject({
      currentLevelPlan: currentGuidelines,
      nextLevelExpectations: nextGuidelines
    })
    expect(result.generatedAt).toBeInstanceOf(Date)
  })

  it('should handle job metadata correctly', () => {
    expect(handler.jobType).toBe('career_plan_generation')
    expect(handler.estimatedDuration).toBe(30)
  })

  it('should trim whitespace from responses', async () => {
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn()
      .mockResolvedValueOnce({ content: '  \nCurrent  \n  ' })
      .mockResolvedValueOnce({ content: '\n\n  Next  \n' })

    const result = await handler.process(
      { role: 'QA', level: 'Mid' },
      mockContext
    )

    expect(result.currentLevelPlan).toBe('Current')
    expect(result.nextLevelExpectations).toBe('Next')
  })

  it('should handle errors and propagate them', async () => {
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn().mockRejectedValue(new Error('LLM failure'))

    await expect(
      handler.process(
        { role: 'Designer', level: 'Senior' },
        mockContext
      )
    ).rejects.toThrow('LLM failure')

    // Should have attempted to update progress before failing
    expect(mockContext.updateProgress).toHaveBeenCalledWith(10, 'Starting career guidelines generation...')
    expect(mockContext.updateProgress).toHaveBeenCalledWith(20, 'Analyzing expectations for Senior Designer...')
  })

  it('should handle all seniority levels correctly', async () => {
    const testCases = [
      { input: 'Junior', expectedNext: 'Mid-Level' },
      { input: 'Mid-Level', expectedNext: 'Senior' },
      { input: 'Senior', expectedNext: 'Staff' },
      { input: 'Staff', expectedNext: 'Principal' },
      { input: 'Principal', expectedNext: 'Distinguished' }
    ]

    for (const testCase of testCases) {
      jest.clearAllMocks()
      
      const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
      llmProxyMock.request = jest.fn()
        .mockResolvedValueOnce({ content: 'Current' })
        .mockResolvedValueOnce({ content: 'Next' })

      await handler.process(
        { role: 'Engineer', level: testCase.input },
        mockContext
      )

      const secondCall = (llmProxyMock.request as jest.Mock).mock.calls[1][0]
      expect(secondCall.context.level).toBe(testCase.expectedNext)
    }
  })

  it('should include current guidelines in prompt for next level', async () => {
    const currentContent = '#### Skills\n* Advanced technical expertise'
    
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn()
      .mockResolvedValueOnce({ content: currentContent })
      .mockResolvedValueOnce({ content: 'Next level' })

    await handler.process(
      { role: 'PM', level: 'Senior' },
      mockContext
    )

    // Check that the prompt for next level includes current guidelines
    const secondCall = (llmProxyMock.request as jest.Mock).mock.calls[1][0]
    expect(secondCall.prompt).toContain('REFERENCE CONTEXT')
    expect(secondCall.prompt).toContain(currentContent)
    expect(secondCall.prompt).toContain('Build upon and extend')
  })
})