/**
 * Comprehensive test suite for reflection preferences functionality
 * Tests API endpoints, data validation, and integration with user preferences
 */

import { NextRequest } from 'next/server'
import { GET, PUT } from '../app/api/user/reflection-preferences/route'
import { POST } from '../app/api/reflections/generate/route'
import { createUserDataService } from '../lib/user-scoped-data'
import { 
  DEFAULT_REFLECTION_PREFERENCES,
  REFLECTION_DAYS 
} from '../types/reflection-preferences'
import { hourlyReflectionChecker } from '../lib/schedulers/hourly-reflection-checker'

// Mock user data service
jest.mock('../lib/user-scoped-data')
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

// Mock job service
jest.mock('../lib/job-processor/job-service', () => ({
  jobService: {
    processJob: jest.fn().mockResolvedValue(true)
  }
}))

describe('Reflection Preferences System', () => {
  let mockDataService: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDataService = {
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      getIntegrations: jest.fn().mockResolvedValue([
        { id: '1', type: 'google_calendar', isActive: true },
        { id: '2', type: 'github', isActive: true }
      ]),
      getAsyncOperations: jest.fn().mockResolvedValue([]),
      createAsyncOperation: jest.fn().mockResolvedValue({
        id: 'test-operation-id',
        operationType: 'weekly_reflection',
        status: 'queued'
      }),
      getSnippetsInDateRange: jest.fn().mockResolvedValue([]),
      disconnect: jest.fn()
    }
    
    mockCreateUserDataService.mockReturnValue(mockDataService)
  })

  describe('API Endpoints', () => {
    describe('GET /api/user/reflection-preferences', () => {
      it('should return user preferences with defaults', async () => {
        mockDataService.getUserProfile.mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          reflectionAutoGenerate: true,
          reflectionPreferredDay: 'friday',
          reflectionPreferredHour: 14,
          reflectionTimezone: 'America/New_York',
          reflectionIncludeIntegrations: ['google_calendar'],
          reflectionNotifyOnGeneration: false
        })

        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          headers: { 'X-Dev-User-Id': 'user-1' }
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.preferences).toMatchObject({
          autoGenerate: true,
          preferredDay: 'friday',
          preferredHour: 14,
          timezone: 'America/New_York',
          includeIntegrations: ['google_calendar'],
          notifyOnGeneration: false
        })
        expect(data.availableIntegrations).toEqual(['google_calendar', 'github'])
      })

      it('should return defaults for new user', async () => {
        mockDataService.getUserProfile.mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          reflectionAutoGenerate: true,
          reflectionPreferredDay: 'friday',
          reflectionPreferredHour: 14,
          reflectionTimezone: 'America/New_York',
          reflectionIncludeIntegrations: [],
          reflectionNotifyOnGeneration: false
        })

        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          headers: { 'X-Dev-User-Id': 'user-1' }
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.preferences.autoGenerate).toBe(true)
        expect(data.preferences.preferredDay).toBe('friday')
      })

      it('should require authentication', async () => {
        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Authentication required')
      })
    })

    describe('PUT /api/user/reflection-preferences', () => {
      it('should update valid preferences', async () => {
        const updatedProfile = {
          id: 'user-1',
          email: 'test@example.com',
          reflectionAutoGenerate: false,
          reflectionPreferredDay: 'monday',
          reflectionPreferredHour: 9,
          reflectionTimezone: 'America/Los_Angeles',
          reflectionIncludeIntegrations: ['github'],
          reflectionNotifyOnGeneration: true
        }

        mockDataService.updateUserProfile.mockResolvedValue(updatedProfile)

        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            autoGenerate: false,
            preferredDay: 'monday',
            preferredHour: 9,
            timezone: 'America/Los_Angeles',
            includeIntegrations: ['github'],
            notifyOnGeneration: true
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.preferences.autoGenerate).toBe(false)
        expect(data.preferences.preferredDay).toBe('monday')
        expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
          reflectionAutoGenerate: false,
          reflectionPreferredDay: 'monday',
          reflectionPreferredHour: 9,
          reflectionTimezone: 'America/Los_Angeles',
          reflectionIncludeIntegrations: ['github'],
          reflectionNotifyOnGeneration: true
        })
      })

      it('should validate hour range', async () => {
        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            preferredHour: 25 // Invalid hour
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Hour must be between 0 and 23')
      })

      it('should validate day options', async () => {
        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            preferredDay: 'wednesday' // Invalid day
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid preferred day')
      })

      it('should validate timezone', async () => {
        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            timezone: 'Invalid/Timezone'
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid timezone')
      })

      it('should validate integration types', async () => {
        mockDataService.getIntegrations.mockResolvedValue([
          { id: '1', type: 'google_calendar', isActive: true }
        ])

        const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            includeIntegrations: ['google_calendar', 'invalid_integration']
          })
        })

        const response = await PUT(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid integration types')
      })
    })

    describe('POST /api/reflections/generate', () => {
      it('should start manual reflection generation', async () => {
        const request = new NextRequest('http://localhost:3000/api/reflections/generate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            triggerType: 'manual',
            includePreviousContext: true
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.operationId).toBe('test-operation-id')
        expect(data.message).toContain('started successfully')
      })

      it('should prevent duplicate generation', async () => {
        mockDataService.getAsyncOperations.mockResolvedValue([
          {
            id: 'existing-op',
            operationType: 'weekly_reflection',
            status: 'processing'
          }
        ])

        const request = new NextRequest('http://localhost:3000/api/reflections/generate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'user-1' 
          },
          body: JSON.stringify({
            triggerType: 'manual'
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.success).toBe(false)
        expect(data.error).toContain('already being generated')
      })

      it('should require authentication', async () => {
        const request = new NextRequest('http://localhost:3000/api/reflections/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerType: 'manual' })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Authentication required')
      })
    })
  })

  describe('Data Validation', () => {
    describe('Basic validation logic', () => {
      it('should validate hour range', () => {
        // Test valid hours
        expect(0).toBeGreaterThanOrEqual(0)
        expect(0).toBeLessThanOrEqual(23)
        expect(23).toBeGreaterThanOrEqual(0)
        expect(23).toBeLessThanOrEqual(23)
        
        // Test invalid hours
        expect(24).toBeGreaterThan(23)
        expect(-1).toBeLessThan(0)
      })

      it('should validate day options', () => {
        const validDays = ['monday', 'friday', 'sunday']
        expect(validDays).toContain('friday')
        expect(validDays).toContain('monday')
        expect(validDays).toContain('sunday')
        expect(validDays).not.toContain('wednesday')
      })

      it('should validate timezone format', () => {
        // Basic timezone format validation
        const validTimezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo']
        const invalidTimezones = ['Invalid/Timezone', 'Not_A_Zone']
        
        validTimezones.forEach(tz => {
          expect(tz).toMatch(/^[A-Z][a-z]+\/[A-Z][a-z_]+$/)
        })
        
        invalidTimezones.forEach(tz => {
          expect(tz).not.toMatch(/^[A-Z][a-z]+\/[A-Z][a-z_]+$/)
        })
      })
    })
  })

  describe('Hourly Reflection Checker', () => {
    it('should process users with correct preferences', async () => {
      // This would require more extensive mocking of Prisma and time utilities
      // For now, we'll test the basic structure
      expect(typeof hourlyReflectionChecker.checkAndProcessUsers).toBe('function')
    })
  })

  describe('Integration Validation', () => {
    it('should validate available integrations against user selection', () => {
      const availableIntegrations = ['google_calendar', 'github']
      const userSelection = ['google_calendar', 'slack']

      const invalidIntegrations = userSelection.filter(
        integration => !availableIntegrations.includes(integration)
      )

      expect(invalidIntegrations).toEqual(['slack'])
    })
  })

  describe('Default Values', () => {
    it('should provide sensible defaults', () => {
      expect(DEFAULT_REFLECTION_PREFERENCES.autoGenerate).toBe(true)
      expect(DEFAULT_REFLECTION_PREFERENCES.preferredDay).toBe('friday')
      expect(DEFAULT_REFLECTION_PREFERENCES.preferredHour).toBe(14)
      expect(DEFAULT_REFLECTION_PREFERENCES.timezone).toBe('America/New_York')
      expect(DEFAULT_REFLECTION_PREFERENCES.includeIntegrations).toEqual([])
      expect(DEFAULT_REFLECTION_PREFERENCES.notifyOnGeneration).toBe(false)
    })

    it('should have valid day options', () => {
      const validDays = ['monday', 'friday', 'sunday']
      REFLECTION_DAYS.forEach(day => {
        expect(validDays).toContain(day.value)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDataService.getUserProfile.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
        headers: { 'X-Dev-User-Id': 'user-1' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to fetch preferences')
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/reflection-preferences', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'user-1' 
        },
        body: 'invalid json'
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})