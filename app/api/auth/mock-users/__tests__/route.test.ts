/**
 * Security Tests for Mock Users API Endpoint
 * 
 * CRITICAL: These tests ensure that production user data is NEVER exposed
 * through the mock users endpoint, regardless of environment or database state.
 */

import { NextRequest } from 'next/server'

// Mock PrismaClient before any imports
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  }
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  }
})

// Import the route functions after mocking PrismaClient
import { GET, POST, PUT, DELETE } from '../route'

// Get reference to the mock
const { PrismaClient } = require('@prisma/client')
const mockPrisma = new PrismaClient()

// Mock simplified environment detection
jest.mock('../../../../../lib/environment')
import { getEnvironmentMode } from '../../../../../lib/environment'
const mockGetEnvironmentMode = getEnvironmentMode as jest.MockedFunction<typeof getEnvironmentMode>

describe('Mock Users API Security Tests', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = new NextRequest('http://localhost:3000/api/auth/mock-users')
    // Note: $disconnect is no longer called in the refactored code
  })

  describe('SECURITY: Production Environment Protection', () => {
    it('MUST deny access in production environment', async () => {
      mockGetEnvironmentMode.mockReturnValue('production')

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not available in production')
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
    })

    it('MUST log security warning when accessed in production', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      mockGetEnvironmentMode.mockReturnValue('production')

      await GET(mockRequest)

      expect(consoleSpy).toHaveBeenCalledWith(
        '🚨 SECURITY: Mock users API accessed in production environment - DENIED'
      )
      consoleSpy.mockRestore()
    })
  })

  describe('SECURITY: Data Filtering', () => {
    it('MUST only return staging users in staging environment', async () => {
      mockGetEnvironmentMode.mockReturnValue('staging')
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'staging_1', name: 'Jack', email: 'jack+staging@company.com', image: '', jobTitle: 'Engineer' },
        { id: 'staging_2', name: 'Sarah', email: 'sarah+staging@example.com', image: '', jobTitle: 'Engineer' }
      ])

      await GET(mockRequest)

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { startsWith: 'staging_' } },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          jobTitle: true,
          seniorityLevel: true
        },
        orderBy: { id: 'asc' }
      })
    })

    it('MUST only return safe dev users in development environment', async () => {
      mockGetEnvironmentMode.mockReturnValue('development')
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', name: 'Jack', email: 'jack@company.com', image: '', jobTitle: 'Engineer' }
      ])

      await GET(mockRequest)

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { id: { in: ['1', '2', '3', '4', '5'] } },
            { id: { startsWith: 'dev_' } },
            { id: { startsWith: 'dev-' } },
            { id: { startsWith: 'test_' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          jobTitle: true,
          seniorityLevel: true
        },
        orderBy: { id: 'asc' }
      })
    })
  })

  describe('SECURITY: Production Data Detection', () => {
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('MUST reject response containing UUID-like production user IDs', async () => {
      mockGetEnvironmentMode.mockReturnValue('staging')
      
      // Simulate database returning production user (UUID format)
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Production User', email: 'real@user.com', image: '', jobTitle: 'Real Job' }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Security violation: Production data detected')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🚨 SECURITY BREACH: Production user data detected in mock users response!'
      )
    })

    it('MUST reject response containing suspicious non-prefixed IDs', async () => {
      mockGetEnvironmentMode.mockReturnValue('staging')
      
      // Simulate database returning suspicious user ID
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user_abc123', name: 'Suspicious User', email: 'suspicious@user.com', image: '', jobTitle: 'Suspicious Job' }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Security violation: Production data detected')
    })

    it('MUST allow safe staging users with staging_ prefix', async () => {
      mockGetEnvironmentMode.mockReturnValue('staging')
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'staging_1', name: 'Jack', email: 'jack+staging@company.com', image: '', jobTitle: 'Engineer' },
        { id: 'staging_2', name: 'Sarah', email: 'sarah+staging@example.com', image: '', jobTitle: 'Engineer' }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].id).toBe('staging_1')
      expect(data[1].id).toBe('staging_2')
    })

    it('MUST allow safe development users with numeric IDs', async () => {
      mockGetEnvironmentMode.mockReturnValue('development')
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', name: 'Jack', email: 'jack@company.com', image: '', jobTitle: 'Engineer' },
        { id: '2', name: 'Sarah', email: 'sarah@example.com', image: '', jobTitle: 'Engineer' }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].id).toBe('1')
      expect(data[1].id).toBe('2')
    })

    it('MUST reject staging users in development environment', async () => {
      mockGetEnvironmentMode.mockReturnValue('development')
      
      // Simulate database returning a staging user in a dev environment context
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'staging_1', name: 'Staging User', email: 'staging@user.com', image: '', jobTitle: 'Staging Job' }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Security violation: Production data detected')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🚨 SECURITY BREACH: Production user data detected in mock users response!'
      )
    })
  })

  describe('SECURITY: HTTP Method Restrictions', () => {
    it('MUST reject POST requests', async () => {
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })

    it('MUST reject PUT requests', async () => {
      const response = await PUT()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })

    it('MUST reject DELETE requests', async () => {
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.error).toBe('Method not allowed')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetEnvironmentMode.mockReturnValue('development')
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database connection failed'))

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch users')
      // Note: $disconnect is no longer called in the refactored code for better connection pooling
    })

    it('should transform user data to MockUser format correctly', async () => {
      mockGetEnvironmentMode.mockReturnValue('staging')
      mockPrisma.user.findMany.mockResolvedValue([
        { 
          id: 'staging_1', 
          name: 'Jack Thompson', 
          email: 'jack+staging@company.com', 
          image: 'https://example.com/jack.jpg',
          jobTitle: 'Senior Software Engineer',
          seniorityLevel: 'Senior'
        }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data[0]).toEqual({
        id: 'staging_1',
        name: 'Jack Thompson',
        email: 'jack+staging@company.com',
        image: 'https://example.com/jack.jpg',
        role: 'Senior Software Engineer'
      })
    })

    it('should handle null/undefined user fields gracefully', async () => {
      mockGetEnvironmentMode.mockReturnValue('staging')
      mockPrisma.user.findMany.mockResolvedValue([
        { 
          id: 'staging_1', 
          name: null, 
          email: 'jack+staging@company.com', 
          image: null,
          jobTitle: null,
          seniorityLevel: 'Senior'
        }
      ])

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data[0]).toEqual({
        id: 'staging_1',
        name: 'Unknown User',
        email: 'jack+staging@company.com',
        image: '',
        role: 'Unknown Role'
      })
    })
  })
})