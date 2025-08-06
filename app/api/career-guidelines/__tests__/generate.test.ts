/**
 * Tests for Career Guidelines Generate API Route
 * 
 * Verifies that the API properly generates guidelines with context
 */

import { POST } from '../generate/route'
import { NextRequest } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { llmProxy } from '../../../../lib/llmproxy'

// Mock dependencies
jest.mock('../../../../lib/auth-utils')
jest.mock('../../../../lib/dev-auth')
jest.mock('../../../../lib/llmproxy')

describe('POST /api/career-guidelines/generate', () => {
  const mockUserId = 'test-user-123'
  const mockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers()
    } as unknown as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId)
    ;(getDevUserIdFromRequest as jest.Mock).mockResolvedValue(null)
  })

  it('should generate guidelines with current level as context for next level', async () => {
    const currentLevelContent = `#### Impact & Ownership
* Delivers medium-sized projects independently
* Contributes to team goals effectively

#### Craft & Expertise
* Strong technical skills in core areas
* Writes clean, maintainable code`

    const nextLevelContent = `#### Impact & Ownership
* Leads large, complex projects across teams
* Drives strategic initiatives and influences roadmap

#### Craft & Expertise
* Deep expertise across multiple domains
* Sets technical standards and best practices`

    // Mock LLM responses
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn()
      .mockResolvedValueOnce({ content: currentLevelContent })
      .mockResolvedValueOnce({ content: nextLevelContent })

    const request = mockRequest({
      role: 'Software Engineer',
      level: 'Senior',
      companyLadder: 'Standard tech ladder'
    })

    const response = await POST(request)
    const data = await response.json()

    // Verify both LLM calls were made
    expect(llmProxyMock.request).toHaveBeenCalledTimes(2)

    // Verify first call (current level)
    expect(llmProxyMock.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      temperature: 0.7,
      maxTokens: 1500,
      context: expect.objectContaining({
        role: 'Software Engineer',
        level: 'Senior',
        targetLevel: 'current'
      })
    }))

    // Verify second call (next level with context)
    expect(llmProxyMock.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      temperature: 0.7,
      maxTokens: 1500,
      context: expect.objectContaining({
        role: 'Software Engineer',
        level: 'Staff', // Next level after Senior
        targetLevel: 'next',
        currentLevelGuidelines: currentLevelContent // Should include current level as context
      })
    }))

    // Verify response
    expect(response.status).toBe(200)
    expect(data).toEqual({
      currentLevelPlan: currentLevelContent,
      nextLevelExpectations: nextLevelContent,
      isGenerated: true
    })
  })

  it('should handle authentication correctly', async () => {
    (getUserIdFromRequest as jest.Mock).mockResolvedValue(null)
    ;(getDevUserIdFromRequest as jest.Mock).mockResolvedValue(null)

    const request = mockRequest({
      role: 'Engineer',
      level: 'Senior'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should validate required fields', async () => {
    const request = mockRequest({
      role: 'Engineer'
      // Missing level
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('should handle LLM errors gracefully', async () => {
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn().mockRejectedValue(new Error('LLM service unavailable'))

    const request = mockRequest({
      role: 'Software Engineer',
      level: 'Senior'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to generate career guidelines')
  })

  it('should trim whitespace from LLM responses', async () => {
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn()
      .mockResolvedValueOnce({ content: '  \n\nCurrent level content\n\n  ' })
      .mockResolvedValueOnce({ content: '  Next level content  \n' })

    const request = mockRequest({
      role: 'Designer',
      level: 'Mid'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.currentLevelPlan).toBe('Current level content')
    expect(data.nextLevelExpectations).toBe('Next level content')
  })

  it('should pass company ladder to both generations', async () => {
    const llmProxyMock = llmProxy as jest.Mocked<typeof llmProxy>
    llmProxyMock.request = jest.fn()
      .mockResolvedValueOnce({ content: 'Current' })
      .mockResolvedValueOnce({ content: 'Next' })

    const companyLadder = 'Our company uses a custom progression framework'
    const request = mockRequest({
      role: 'PM',
      level: 'Senior',
      companyLadder
    })

    await POST(request)

    // Verify company ladder was passed to both calls
    expect(llmProxyMock.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      context: expect.objectContaining({
        companyLadder
      })
    }))

    expect(llmProxyMock.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      context: expect.objectContaining({
        companyLadder
      })
    }))
  })
})