/**
 * Unit tests for the user profile API route
 * Tests input validation, error handling, and enum constraints
 */

import { GET, PUT } from '../route'
import { NextRequest } from 'next/server'
import { createUserDataService } from '@/lib/user-scoped-data'
import { createMockUserProfile, testData } from '@/test-utils/mock-factories'

// Mock auth utils first
jest.mock('@/lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn().mockResolvedValue('user-123')
}))

// Mock the user data service
jest.mock('@/lib/user-scoped-data')
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

describe('/api/user/profile', () => {
  let mockDataService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDataService = {
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      disconnect: jest.fn()
    }
    
    mockCreateUserDataService.mockReturnValue(mockDataService)
  })

  describe('GET /api/user/profile', () => {
    it('should return user profile successfully', async () => {
      // Use factory function for consistent mock data
      const mockProfile = testData.standardUserProfile

      mockDataService.getUserProfile.mockResolvedValue(mockProfile)

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        jobTitle: 'engineer',
        seniorityLevel: 'senior',
        onboardingCompleted: true,
        onboardingCompletedAt: '2025-01-01T10:00:00.000Z'
      })
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should return 404 if profile not found', async () => {
      mockDataService.getUserProfile.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User profile not found')
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.getUserProfile.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/user/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch profile')
    })
  })

  describe('PUT /api/user/profile', () => {
    it('should update profile with valid role and level', async () => {
      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        jobTitle: 'engineer',
        seniorityLevel: 'senior',
        performanceFeedback: null,
        onboardingCompletedAt: null
      }

      mockDataService.updateUserProfile.mockResolvedValue(updatedProfile)

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          jobTitle: 'engineer',
          seniorityLevel: 'senior'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
        jobTitle: 'engineer',
        seniorityLevel: 'senior'
      })
      expect(data.id).toBe('user-123')
      expect(data.jobTitle).toBe('engineer')
      expect(data.seniorityLevel).toBe('senior')
    })

    it('should return 400 if jobTitle is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          seniorityLevel: 'senior'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Job title and seniority level are required')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should return 400 if seniorityLevel is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          jobTitle: 'engineer'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Job title and seniority level are required')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should accept custom job titles and seniority levels', async () => {
      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        jobTitle: 'Custom Role',
        seniorityLevel: 'Principal Architect',
        performanceFeedback: null,
        onboardingCompletedAt: null
      }

      mockDataService.updateUserProfile.mockResolvedValue(updatedProfile)

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          jobTitle: 'Custom Role',
          seniorityLevel: 'Principal Architect'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
        jobTitle: 'Custom Role',
        seniorityLevel: 'Principal Architect'
      })
      expect(data.jobTitle).toBe('Custom Role')
      expect(data.seniorityLevel).toBe('Principal Architect')
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          jobTitle: 'engineer',
          seniorityLevel: 'senior'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update profile')
    })

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: 'invalid json'
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update profile')
    })

  })
})