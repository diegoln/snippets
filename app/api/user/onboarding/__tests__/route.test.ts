/**
 * Unit tests for the user onboarding API route
 * Tests onboarding completion tracking and validation
 */

import { POST } from '../route'
import { NextRequest } from 'next/server'
import { createUserDataService } from '@/lib/user-scoped-data'

// Mock the user data service
jest.mock('@/lib/user-scoped-data')
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

// Mock auth utils
jest.mock('@/lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn().mockResolvedValue('user-123')
}))

describe('/api/user/onboarding', () => {
  let mockDataService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDataService = {
      updateUserProfile: jest.fn(),
      disconnect: jest.fn()
    }
    
    mockCreateUserDataService.mockReturnValue(mockDataService)
  })

  describe('POST /api/user/onboarding', () => {
    it('should mark onboarding as completed successfully', async () => {
      const mockUpdatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        jobTitle: 'engineer',
        seniorityLevel: 'senior',
        performanceFeedback: null,
        onboardingCompletedAt: new Date('2025-01-01T10:00:00.000Z')
      }

      mockDataService.updateUserProfile.mockResolvedValue(mockUpdatedProfile)

      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
        onboardingCompletedAt: expect.any(Date)
      })
      expect(data.success).toBe(true)
      expect(data.completed).toBe(true)
      expect(data.completedAt).toBeDefined()
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should reject invalid completion status with 400 error', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: false
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should reject missing completed field with 400 error', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should reject null completed field with 400 error', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: null
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should reject string "true" as invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: "true"
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update onboarding status')
    })

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update onboarding status')
    })

    it('should ensure disconnect is called even on errors', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: true
        })
      })

      await POST(request)

      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should return proper ISO timestamp format', async () => {
      const mockDate = new Date('2025-01-01T10:00:00.000Z')
      jest.useFakeTimers()
      jest.setSystemTime(mockDate)

      mockDataService.updateUserProfile.mockResolvedValue({
        id: 'user-123',
        onboardingCompletedAt: mockDate
      })

      const request = new NextRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          completed: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.completedAt).toBe('2025-01-01T10:00:00.000Z')

      jest.useRealTimers()
    })
  })
})