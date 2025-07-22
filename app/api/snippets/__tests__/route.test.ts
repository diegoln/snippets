/**
 * Unit tests for the snippets API route
 * Tests that the API returns data in reverse chronological order
 */

import { GET, PUT } from '../route'
import { NextRequest } from 'next/server'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  },
  weeklySnippet: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  $disconnect: jest.fn()
}

// Mock the PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

describe('/api/snippets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/snippets', () => {
    it('should return snippets in reverse chronological order (most recent first)', async () => {
      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      // Mock snippets data - notice this is already in descending order by date
      const mockSnippets = [
        {
          id: 'snippet-30',
          weekNumber: 30,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Week 30 content'
        },
        {
          id: 'snippet-29',
          weekNumber: 29,
          startDate: new Date('2025-07-14'),
          endDate: new Date('2025-07-18'),
          content: 'Week 29 content'
        },
        {
          id: 'snippet-28',
          weekNumber: 28,
          startDate: new Date('2025-07-07'),
          endDate: new Date('2025-07-11'),
          content: 'Week 28 content'
        }
      ]

      mockPrisma.weeklySnippet.findMany.mockResolvedValue(mockSnippets)

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      // Verify Prisma was called with correct ordering
      expect(mockPrisma.weeklySnippet.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { startDate: 'desc' }, // Most recent first
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true
        }
      })

      // Verify response data is in reverse chronological order
      expect(data).toHaveLength(3)
      expect(data[0].weekNumber).toBe(30) // Most recent
      expect(data[1].weekNumber).toBe(29)
      expect(data[2].weekNumber).toBe(28) // Oldest

      // Verify dates are properly serialized
      expect(data[0].startDate).toBe('2025-07-21')
      expect(data[0].endDate).toBe('2025-07-25')
    })

    it('should handle empty snippets array', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      mockPrisma.weeklySnippet.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual([])
      expect(response.status).toBe(200)
    })

    it('should return 404 if test user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Test user not found. Run npm run setup:dev to initialize.')
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch snippets')
    })

    it('should call $disconnect after operation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })
      mockPrisma.weeklySnippet.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/snippets')
      await GET(request)

      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })

    it('should maintain correct date serialization format', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const mockSnippetsWithDates = [
        {
          id: 'snippet-1',
          weekNumber: 30,
          startDate: new Date('2025-07-21T10:30:00.000Z'),
          endDate: new Date('2025-07-25T15:45:00.000Z'),
          content: 'Test content'
        }
      ]

      mockPrisma.weeklySnippet.findMany.mockResolvedValue(mockSnippetsWithDates)

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      // Should strip time and keep only date part
      expect(data[0].startDate).toBe('2025-07-21')
      expect(data[0].endDate).toBe('2025-07-25')
    })

    it('should preserve all required fields in response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const mockSnippet = {
        id: 'snippet-test',
        weekNumber: 30,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Test content for week 30'
      }

      mockPrisma.weeklySnippet.findMany.mockResolvedValue([mockSnippet])

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(data[0]).toEqual({
        id: 'snippet-test',
        weekNumber: 30,
        startDate: '2025-07-21',
        endDate: '2025-07-25',
        content: 'Test content for week 30'
      })
    })
  })

  describe('PUT /api/snippets', () => {
    it('should update snippet content successfully', async () => {
      const updatedSnippet = {
        id: 'snippet-1',
        weekNumber: 30,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Updated content'
      }

      mockPrisma.weeklySnippet.update.mockResolvedValue(updatedSnippet)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'snippet-1',
          content: 'Updated content'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(mockPrisma.weeklySnippet.update).toHaveBeenCalledWith({
        where: { id: 'snippet-1' },
        data: { content: 'Updated content' }
      })

      expect(data.content).toBe('Updated content')
      expect(data.startDate).toBe('2025-07-21')
      expect(data.endDate).toBe('2025-07-25')
    })

    it('should return 400 if id or content is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({ id: 'snippet-1' }) // Missing content
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('id and content are required')
    })

    it('should handle update errors gracefully', async () => {
      mockPrisma.weeklySnippet.update.mockRejectedValue(new Error('Snippet not found'))

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'invalid-id',
          content: 'Updated content'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update snippet')
    })
  })
})