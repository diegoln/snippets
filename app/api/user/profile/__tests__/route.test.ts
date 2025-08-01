/**
 * Unit tests for the user profile API route
 * Tests input validation, error handling, and enum constraints
 */

import { GET, PUT } from '../route'
import { NextRequest } from 'next/server'
import { createUserDataService } from '@/lib/user-scoped-data'

// Mock the user data service
jest.mock('@/lib/user-scoped-data')
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

// Mock auth utils
jest.mock('@/lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn().mockResolvedValue('user-123')
}))

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
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        jobTitle: 'engineer',
        seniorityLevel: 'senior',
        performanceFeedback: null,
        onboardingCompletedAt: new Date('2025-01-01T10:00:00.000Z')
      }

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
        performanceFeedback: null,
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
      expect(data.error).toBe('Profile not found')
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
      expect(data.jobTitle).toBe('engineer')
      expect(data.seniorityLevel).toBe('senior')
    })

    it('should reject invalid role with 400 error', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          jobTitle: 'invalid-role',
          seniorityLevel: 'senior'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid job title. Must be one of: engineer, designer, product, data')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should reject invalid level with 400 error', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          jobTitle: 'engineer',
          seniorityLevel: 'invalid-level'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid seniority level. Must be one of: junior, mid, senior, staff, principal')
      expect(mockDataService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should update only provided fields', async () => {
      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        jobTitle: 'engineer',
        seniorityLevel: 'senior',
        performanceFeedback: null,
        onboardingCompletedAt: null
      }

      mockDataService.updateUserProfile.mockResolvedValue(updatedProfile)

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Name'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
        name: 'Updated Name'
      })
      expect(data.name).toBe('Updated Name')
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Test Name'
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

    it('should validate all role enum values', async () => {
      const validRoles = ['engineer', 'designer', 'product', 'data']
      
      for (const role of validRoles) {
        const updatedProfile = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          jobTitle: role,
          seniorityLevel: 'senior',
          performanceFeedback: null,
          onboardingCompletedAt: null
        }

        mockDataService.updateUserProfile.mockResolvedValue(updatedProfile)

        const request = new NextRequest('http://localhost:3000/api/user/profile', {
          method: 'PUT',
          body: JSON.stringify({
            jobTitle: role,
            seniorityLevel: 'senior'
          })
        })

        const response = await PUT(request)
        expect(response.status).toBe(200)
      }
    })

    it('should validate all level enum values', async () => {
      const validLevels = ['junior', 'mid', 'senior', 'staff', 'principal']
      
      for (const level of validLevels) {
        const updatedProfile = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          jobTitle: 'engineer',
          seniorityLevel: level,
          performanceFeedback: null,
          onboardingCompletedAt: null
        }

        mockDataService.updateUserProfile.mockResolvedValue(updatedProfile)

        const request = new NextRequest('http://localhost:3000/api/user/profile', {
          method: 'PUT',
          body: JSON.stringify({
            jobTitle: 'engineer',
            seniorityLevel: level
          })
        })

        const response = await PUT(request)
        expect(response.status).toBe(200)
      }
    })
  })
})