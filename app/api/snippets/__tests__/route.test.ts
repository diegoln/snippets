/**
 * Unit tests for the snippets API route
 * Tests that the API returns data in reverse chronological order
 */

import { GET, POST, PUT } from '../route'
import { NextRequest } from 'next/server'

// Mock auth utils to provide test user
jest.mock('@/lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn().mockResolvedValue('user-1')
}))

// Mock the user data service since that's what the API route actually uses
jest.mock('@/lib/user-scoped-data', () => ({
  createUserDataService: jest.fn()
}))

// Import after mocking
import { createUserDataService } from '@/lib/user-scoped-data'
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

// Create mock data service
const mockDataService = {
  getSnippets: jest.fn(),
  createSnippet: jest.fn(),
  updateSnippet: jest.fn(),
  disconnect: jest.fn()
}

describe('/api/snippets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateUserDataService.mockReturnValue(mockDataService)
  })

  describe('GET /api/snippets', () => {
    it('should return snippets in reverse chronological order (most recent first)', async () => {
      // Mock snippets data - notice this is already in descending order by date
      const mockSnippets = [
        {
          id: 'snippet-30',
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Week 30 content',
          extractedTasks: null,
          extractedMeetings: null,
          aiSuggestions: null,
          createdAt: new Date('2025-07-21T10:00:00Z'),
          updatedAt: new Date('2025-07-21T10:00:00Z')
        },
        {
          id: 'snippet-29',
          weekNumber: 29,
          year: 2025,
          startDate: new Date('2025-07-14'),
          endDate: new Date('2025-07-18'),
          content: 'Week 29 content',
          extractedTasks: null,
          extractedMeetings: null,
          aiSuggestions: null,
          createdAt: new Date('2025-07-14T10:00:00Z'),
          updatedAt: new Date('2025-07-14T10:00:00Z')
        },
        {
          id: 'snippet-28',
          weekNumber: 28,
          year: 2025,
          startDate: new Date('2025-07-07'),
          endDate: new Date('2025-07-11'),
          content: 'Week 28 content',
          extractedTasks: null,
          extractedMeetings: null,
          aiSuggestions: null,
          createdAt: new Date('2025-07-07T10:00:00Z'),
          updatedAt: new Date('2025-07-07T10:00:00Z')
        }
      ]

      mockDataService.getSnippets.mockResolvedValue(mockSnippets)

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      // Verify data service was called
      expect(mockDataService.getSnippets).toHaveBeenCalled()
      expect(mockDataService.disconnect).toHaveBeenCalled()

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
      mockDataService.getSnippets.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toEqual([])
      expect(response.status).toBe(200)
    })

    it('should return 401 if user not authenticated', async () => {
      // Mock unauthenticated user
      const { getUserIdFromRequest } = require('@/lib/auth-utils')
      getUserIdFromRequest.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.getSnippets.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch snippets')
    })

    it('should call disconnect after operation', async () => {
      mockDataService.getSnippets.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/snippets')
      await GET(request)

      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should maintain correct date serialization format', async () => {
      const mockSnippetsWithDates = [
        {
          id: 'snippet-1',
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21T10:30:00.000Z'),
          endDate: new Date('2025-07-25T15:45:00.000Z'),
          content: 'Test content',
          extractedTasks: null,
          extractedMeetings: null,
          aiSuggestions: null,
          createdAt: new Date('2025-07-21T10:00:00Z'),
          updatedAt: new Date('2025-07-21T10:00:00Z')
        }
      ]

      mockDataService.getSnippets.mockResolvedValue(mockSnippetsWithDates)

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      // Should strip time and keep only date part
      expect(data[0].startDate).toBe('2025-07-21')
      expect(data[0].endDate).toBe('2025-07-25')
    })

    it('should preserve all required fields in response', async () => {
      const mockSnippet = {
        id: 'snippet-test',
        weekNumber: 30,
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Test content for week 30',
        extractedTasks: null,
        extractedMeetings: null,
        aiSuggestions: null,
        createdAt: new Date('2025-07-21T10:00:00Z'),
        updatedAt: new Date('2025-07-21T10:00:00Z')
      }

      mockDataService.getSnippets.mockResolvedValue([mockSnippet])

      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await GET(request)
      const data = await response.json()

      expect(data[0]).toEqual({
        id: 'snippet-test',
        weekNumber: 30,
        year: 2025,
        startDate: '2025-07-21',
        endDate: '2025-07-25',
        content: 'Test content for week 30',
        extractedTasks: null,
        extractedMeetings: null,
        aiSuggestions: null,
        createdAt: '2025-07-21T10:00:00.000Z',
        updatedAt: '2025-07-21T10:00:00.000Z'
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
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: '## Done\n\n- Test task\n\n## Next\n\n- Next task',
        extractedTasks: null,
        extractedMeetings: null,
        aiSuggestions: null,
        createdAt: new Date('2025-07-26T10:00:00.000Z'),
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockDataService.createSnippet.mockResolvedValue(newSnippet)

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
      expect(mockDataService.createSnippet).toHaveBeenCalledWith({
        weekNumber: 30,
        year: 2025,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        content: '## Done\n\n- Test task\n\n## Next\n\n- Next task'
      })

      expect(data).toEqual({
        id: 'snippet-new',
        weekNumber: 30,
        year: 2025,
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
        year: 2025,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        content: 'Past week content',
        extractedTasks: null,
        extractedMeetings: null,
        aiSuggestions: null,
        createdAt: new Date('2025-07-26T10:00:00.000Z'),
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockDataService.createSnippet.mockResolvedValue(newSnippet)

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
      expect(mockDataService.createSnippet).not.toHaveBeenCalled()
    })

    it('should reject far future week with 400 error', async () => {
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
      expect(mockDataService.createSnippet).not.toHaveBeenCalled()
    })

    it('should return 400 if weekNumber is missing', async () => {
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
      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 54, // Invalid week number (too high)
          content: 'Content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('weekNumber must be a valid week number (1-53)')
    })

    it('should return 400 for negative week numbers', async () => {
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
      // Mock unauthenticated user
      const { getUserIdFromRequest } = require('@/lib/auth-utils')
      getUserIdFromRequest.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30,
          content: 'Content'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.createSnippet.mockRejectedValue(new Error('Database error'))

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
        year: 2025,
        startDate: new Date('2025-07-21'), // Monday of week 30
        endDate: new Date('2025-07-25'),   // Friday of week 30
        content: 'Test content',
        extractedTasks: null,
        extractedMeetings: null,
        aiSuggestions: null,
        createdAt: new Date('2025-07-26T10:00:00.000Z'),
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockDataService.createSnippet.mockResolvedValue(newSnippet)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 30,
          content: 'Test content'
        })
      })

      const response = await POST(request)
      await response.json()

      // Verify the dates passed to createSnippet are correct
      const createCall = mockDataService.createSnippet.mock.calls[0][0]
      const startDate = createCall.startDate
      const endDate = createCall.endDate

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
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Updated content',
        extractedTasks: null,
        extractedMeetings: null,
        aiSuggestions: null,
        updatedAt: new Date('2025-07-26T10:00:00.000Z')
      }

      mockDataService.updateSnippet.mockResolvedValue(updatedSnippet)

      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'snippet-1',
          content: 'Updated content'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(mockDataService.updateSnippet).toHaveBeenCalledWith('snippet-1', 'Updated content')

      expect(data.content).toBe('Updated content')
      expect(data.startDate).toBe('2025-07-21')
      expect(data.endDate).toBe('2025-07-25')
      expect(data.year).toBe(2025)
      expect(data.updatedAt).toBe('2025-07-26T10:00:00.000Z')
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
      mockDataService.updateSnippet.mockRejectedValue(new Error('Snippet not found'))

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