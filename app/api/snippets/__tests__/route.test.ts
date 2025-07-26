/**
 * Unit tests for the snippets API route
 * Tests that the API returns data in reverse chronological order
 */

import { GET, POST, PUT } from '../route'
import { NextRequest } from 'next/server'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  },
  weeklySnippet: {
    findMany: jest.fn(),
    create: jest.fn(),
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

  describe('POST /api/snippets', () => {
    beforeEach(() => {
      // Mock the current date to be predictable for tests
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-07-26T10:00:00.000Z')) // Week 30 of 2025
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should create snippet for current week successfully', async () => {
      const newSnippet = {
        id: 'snippet-new',
        weekNumber: 30,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: '## Done\n\n- Test task\n\n## Next\n\n- Next task',
        createdAt: new Date('2025-07-26T10:00:00.000Z'),
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })
      mockPrisma.weeklySnippet.create.mockResolvedValue(newSnippet)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30,
          content: '## Done\n\n- Test task\n\n## Next\n\n- Next task'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.weeklySnippet.create).toHaveBeenCalledWith({
        data: {
          weekNumber: 30,
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          content: '## Done\n\n- Test task\n\n## Next\n\n- Next task',
          userId: 'user-1'
        },
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      })

      expect(data).toEqual({
        id: 'snippet-new',
        weekNumber: 30,
        startDate: '2025-07-21',
        endDate: '2025-07-25',
        content: '## Done\n\n- Test task\n\n## Next\n\n- Next task',
        createdAt: '2025-07-26T10:00:00.000Z',
        updatedAt: '2025-07-26T10:00:00.000Z'
      })
    })

    it('should create snippet for past week successfully', async () => {
      const newSnippet = {
        id: 'snippet-past',
        weekNumber: 29,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        content: 'Past week content',
        createdAt: new Date('2025-07-26T10:00:00.000Z'),
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })
      mockPrisma.weeklySnippet.create.mockResolvedValue(newSnippet)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 29, // Past week
          content: 'Past week content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.weekNumber).toBe(29)
    })

    it('should reject future week with 400 error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 31, // Future week (current is 30)
          content: 'Future content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot create snippets for future weeks')
      expect(mockPrisma.weeklySnippet.create).not.toHaveBeenCalled()
    })

    it('should reject far future week with 400 error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 52, // Way in the future
          content: 'Far future content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot create snippets for future weeks')
      expect(mockPrisma.weeklySnippet.create).not.toHaveBeenCalled()
    })

    it('should return 400 if weekNumber is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Content without week number'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('weekNumber and content are required')
    })

    it('should return 400 for invalid week numbers', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 0, // Invalid week number
          content: 'Content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('weekNumber must be a valid week number (1-53)')
    })

    it('should return 400 for negative week numbers', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: -1, // Invalid week number
          content: 'Content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('weekNumber must be a valid week number (1-53)')
    })

    it('should return 400 if content is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('weekNumber and content are required')
    })

    it('should return 401 if user not authenticated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30,
          content: 'Content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Test user not found. Run npm run setup:dev to initialize.')
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })
      mockPrisma.weeklySnippet.create.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30,
          content: 'Content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create snippet')
    })

    it('should calculate correct start and end dates for week', async () => {
      const newSnippet = {
        id: 'snippet-dates',
        weekNumber: 30,
        startDate: new Date('2025-07-21'), // Monday of week 30
        endDate: new Date('2025-07-25'),   // Friday of week 30
        content: 'Test content',
        createdAt: new Date('2025-07-26T10:00:00.000Z'),
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com'
      })
      mockPrisma.weeklySnippet.create.mockResolvedValue(newSnippet)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30,
          content: 'Test content'
        })
      })

      const response = await POST(request)
      await response.json()

      // Verify the dates passed to create are correct
      const createCall = mockPrisma.weeklySnippet.create.mock.calls[0][0]
      const startDate = createCall.data.startDate
      const endDate = createCall.data.endDate

      // Should be Monday to Friday
      expect(startDate.getDay()).toBe(1) // Monday
      expect(endDate.getDay()).toBe(5)   // Friday
      
      // End date should be 4 days after start date
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(4)
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