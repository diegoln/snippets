/**
 * Integration tests for disconnect API functionality
 * 
 * Tests the complete disconnect flow from API endpoints to database operations
 */

import { NextRequest } from 'next/server'

// Mock the dependencies before importing any modules
jest.mock('../lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn()
}))

jest.mock('../lib/dev-auth', () => ({
  getDevUserIdFromRequest: jest.fn()
}))

jest.mock('../lib/user-scoped-data', () => ({
  createUserDataService: jest.fn()
}))

// Import after mocking
import { GET, POST, DELETE } from '../app/api/integrations/route'
import { getUserIdFromRequest } from '../lib/auth-utils'
import { getDevUserIdFromRequest } from '../lib/dev-auth'
import { createUserDataService } from '../lib/user-scoped-data'

const mockGetUserIdFromRequest = getUserIdFromRequest as jest.MockedFunction<typeof getUserIdFromRequest>
const mockGetDevUserIdFromRequest = getDevUserIdFromRequest as jest.MockedFunction<typeof getDevUserIdFromRequest>
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

describe('Integration Disconnect API', () => {
  let mockDataService: any
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Set NODE_ENV to development for dev auth to work
    process.env.NODE_ENV = 'development'
    
    // Create mock data service
    mockDataService = {
      getIntegrations: jest.fn(),
      createIntegration: jest.fn(),
      deleteIntegration: jest.fn(),
      disconnect: jest.fn()
    }

    mockCreateUserDataService.mockReturnValue(mockDataService)

    // Mock auth to return null for production auth, mockUserId for dev auth
    mockGetUserIdFromRequest.mockResolvedValue(null)
    mockGetDevUserIdFromRequest.mockResolvedValue(mockUserId)
  })

  describe('GET /api/integrations', () => {
    it('should return existing integrations', async () => {
      const mockIntegrations = [
        {
          id: 'integration-123',
          type: 'google_calendar',
          expiresAt: null,
          lastSyncAt: new Date('2023-01-01'),
          isActive: true,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ]

      mockDataService.getIntegrations.mockResolvedValue(mockIntegrations)

      const request = new NextRequest('http://localhost/api/integrations', {
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integrations).toHaveLength(1)
      expect(data.integrations[0]).toMatchObject({
        id: 'integration-123',
        type: 'google_calendar',
        isActive: true
      })
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.getIntegrations.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/integrations', {
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch integrations')
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })
  })

  describe('DELETE /api/integrations', () => {
    it('should delete integration successfully', async () => {
      mockDataService.deleteIntegration.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/integrations?id=integration-123', {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Calendar integration disabled successfully')
      expect(mockDataService.deleteIntegration).toHaveBeenCalledWith('integration-123')
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should require integration ID', async () => {
      const request = new NextRequest('http://localhost/api/integrations', {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Integration ID required')
      expect(mockDataService.deleteIntegration).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      // Mock no user ID for both auth methods
      mockGetUserIdFromRequest.mockResolvedValue(null)
      mockGetDevUserIdFromRequest.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/integrations?id=integration-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
      expect(mockDataService.deleteIntegration).not.toHaveBeenCalled()
    })

    it('should handle database errors during deletion', async () => {
      mockDataService.deleteIntegration.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/integrations?id=integration-123', {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to disable calendar integration')
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should pass integration ID correctly to data service', async () => {
      const testIntegrationId = 'test-calendar-456'
      mockDataService.deleteIntegration.mockResolvedValue(undefined)

      const request = new NextRequest(`http://localhost/api/integrations?id=${testIntegrationId}`, {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      await DELETE(request)

      expect(mockDataService.deleteIntegration).toHaveBeenCalledWith(testIntegrationId)
    })

    it('should create data service with correct user ID', async () => {
      const testUserId = 'specific-user-789'
      
      // Mock specific user ID
      mockGetUserIdFromRequest.mockResolvedValue(null)
      mockGetDevUserIdFromRequest.mockResolvedValue(testUserId)

      mockDataService.deleteIntegration.mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/integrations?id=integration-123', {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': testUserId }
      })

      await DELETE(request)

      expect(mockCreateUserDataService).toHaveBeenCalledWith(testUserId)
    })
  })

  describe('POST /api/integrations (for creating integrations before disconnect)', () => {
    it('should prevent duplicate integrations', async () => {
      const existingIntegration = {
        id: 'existing-123',
        type: 'google_calendar',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDataService.getIntegrations.mockResolvedValue([existingIntegration])

      const request = new NextRequest('http://localhost/api/integrations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': mockUserId 
        },
        body: JSON.stringify({ type: 'google_calendar' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Calendar integration is already enabled')
      expect(mockDataService.createIntegration).not.toHaveBeenCalled()
    })

    it('should create new integration when none exists', async () => {
      const newIntegration = {
        id: 'new-123',
        type: 'google_calendar',
        isActive: true,
        createdAt: new Date()
      }

      mockDataService.getIntegrations.mockResolvedValue([]) // No existing integrations
      mockDataService.createIntegration.mockResolvedValue(newIntegration)

      const request = new NextRequest('http://localhost/api/integrations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': mockUserId 
        },
        body: JSON.stringify({ type: 'google_calendar' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.integration.id).toBe('new-123')
      expect(mockDataService.createIntegration).toHaveBeenCalledWith(expect.objectContaining({
        type: 'google_calendar',
        isActive: true
      }))
    })
  })

  describe('Complete Connect-Disconnect Flow', () => {
    it('should handle full connect then disconnect lifecycle', async () => {
      // Step 1: Create integration
      const newIntegration = {
        id: 'lifecycle-123',
        type: 'google_calendar',
        isActive: true,
        createdAt: new Date()
      }

      mockDataService.getIntegrations.mockResolvedValueOnce([]) // No existing
      mockDataService.createIntegration.mockResolvedValue(newIntegration)

      const createRequest = new NextRequest('http://localhost/api/integrations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': mockUserId 
        },
        body: JSON.stringify({ type: 'google_calendar' })
      })

      const createResponse = await POST(createRequest)
      expect(createResponse.status).toBe(200)

      // Step 2: Verify integration exists
      mockDataService.getIntegrations.mockResolvedValueOnce([{
        ...newIntegration,
        expiresAt: null,
        lastSyncAt: null,
        updatedAt: new Date()
      }])

      const getRequest = new NextRequest('http://localhost/api/integrations', {
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const getResponse = await GET(getRequest)
      const getData = await getResponse.json()
      
      expect(getResponse.status).toBe(200)
      expect(getData.integrations).toHaveLength(1)
      expect(getData.integrations[0].id).toBe('lifecycle-123')

      // Step 3: Delete integration
      mockDataService.deleteIntegration.mockResolvedValue(undefined)

      const deleteRequest = new NextRequest('http://localhost/api/integrations?id=lifecycle-123', {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const deleteResponse = await DELETE(deleteRequest)
      const deleteData = await deleteResponse.json()

      expect(deleteResponse.status).toBe(200)
      expect(deleteData.success).toBe(true)
      expect(mockDataService.deleteIntegration).toHaveBeenCalledWith('lifecycle-123')

      // Step 4: Verify integration is gone
      mockDataService.getIntegrations.mockResolvedValueOnce([]) // Now empty

      const finalGetRequest = new NextRequest('http://localhost/api/integrations', {
        headers: { 'X-Dev-User-Id': mockUserId }
      })

      const finalGetResponse = await GET(finalGetRequest)
      const finalGetData = await finalGetResponse.json()

      expect(finalGetResponse.status).toBe(200)
      expect(finalGetData.integrations).toHaveLength(0)
    })
  })

  describe('User Isolation', () => {
    it('should only allow users to delete their own integrations', async () => {
      const user2Id = 'user-2'

      // Mock user 2 authentication
      mockGetUserIdFromRequest.mockResolvedValue(null)
      mockGetDevUserIdFromRequest.mockResolvedValue(user2Id)

      const user2DataService = {
        deleteIntegration: jest.fn().mockRejectedValue(new Error('Integration not found')),
        disconnect: jest.fn()
      }

      mockCreateUserDataService.mockReturnValue(user2DataService)

      const request = new NextRequest('http://localhost/api/integrations?id=integration-123', {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': user2Id }
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to disable calendar integration')
      expect(mockCreateUserDataService).toHaveBeenCalledWith(user2Id)
      expect(user2DataService.deleteIntegration).toHaveBeenCalledWith('integration-123')
    })
  })
})