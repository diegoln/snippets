/**
 * Unit tests for UserScopedDataService snippet operations
 * Focuses on future week validation and snippet management
 */

import { UserScopedDataService } from '../user-scoped-data'

// Mock Prisma with all required methods
const mockPrisma = {
  weeklySnippet: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn() // Add missing upsert method
  },
  $disconnect: jest.fn()
}

// Mock the PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

describe('UserScopedDataService - Snippet Operations', () => {
  let dataService: UserScopedDataService

  beforeEach(() => {
    jest.clearAllMocks()
    dataService = new UserScopedDataService('test-user-id')
    
    // Mock the current date to be predictable for tests
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-07-26T10:00:00.000Z')) // Week 30 of 2025
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('createSnippet', () => {
    it('should create snippet for current week successfully', async () => {
      const mockSnippet = {
        id: 'snippet-id',
        weekNumber: 30,
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Test content',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.weeklySnippet.upsert.mockResolvedValue(mockSnippet)

      const result = await dataService.createSnippet({
        weekNumber: 30,
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Test content'
      })

      expect(mockPrisma.weeklySnippet.upsert).toHaveBeenCalledWith({
        where: {
          userId_year_weekNumber: {
            userId: 'test-user-id',
            year: 2025,
            weekNumber: 30
          }
        },
        create: {
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Test content',
          userId: 'test-user-id'
        },
        update: {
          content: 'Test content',
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          updatedAt: expect.any(Date)
        },
        select: {
          id: true,
          weekNumber: true,
          year: true,
          startDate: true,
          endDate: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      })

      expect(result).toEqual(mockSnippet)
    })

    it('should create snippet for past week successfully', async () => {
      const mockSnippet = {
        id: 'snippet-past',
        weekNumber: 29,
        year: 2025,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        content: 'Past week content',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.weeklySnippet.upsert.mockResolvedValue(mockSnippet)

      const result = await dataService.createSnippet({
        weekNumber: 29, // Past week
        year: 2025,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        content: 'Past week content'
      })

      expect(result.weekNumber).toBe(29)
      expect(mockPrisma.weeklySnippet.upsert).toHaveBeenCalled()
    })

    it('should reject future week with error', async () => {
      await expect(
        dataService.createSnippet({
          weekNumber: 31, // Future week (current is 30)
          year: 2025,
          startDate: new Date('2025-07-28'),
          endDate: new Date('2025-08-01'),
          content: 'Future content'
        })
      ).rejects.toThrow('Cannot create snippets for future weeks')

      expect(mockPrisma.weeklySnippet.upsert).not.toHaveBeenCalled()
    })

    it('should reject far future week with error', async () => {
      await expect(
        dataService.createSnippet({
          weekNumber: 52, // Way in the future
          year: 2025,
          startDate: new Date('2025-12-22'),
          endDate: new Date('2025-12-26'),
          content: 'Far future content'
        })
      ).rejects.toThrow('Cannot create snippets for future weeks')

      expect(mockPrisma.weeklySnippet.upsert).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.weeklySnippet.upsert.mockRejectedValue(new Error('Database connection failed'))

      await expect(
        dataService.createSnippet({
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Test content'
        })
      ).rejects.toThrow('Database connection failed')
    })

    it('should preserve original error message for debugging', async () => {
      const originalError = new Error('Unique constraint violation')
      mockPrisma.weeklySnippet.upsert.mockRejectedValue(originalError)

      try {
        await dataService.createSnippet({
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Test content'
        })
      } catch (error) {
        expect(error).toBe(originalError)
      }
    })
  })

  describe('week calculation consistency', () => {
    it('should calculate current week number correctly', async () => {
      // Test with known date: July 26, 2025 (Saturday) should be week 30
      jest.setSystemTime(new Date('2025-07-26T10:00:00.000Z'))

      await expect(
        dataService.createSnippet({
          weekNumber: 31, // Should be rejected as future
          startDate: new Date('2025-07-28'),
          endDate: new Date('2025-08-01'),
          content: 'Future content'
        })
      ).rejects.toThrow('Cannot create snippets for future weeks')

      // Week 30 should be allowed
      mockPrisma.weeklySnippet.upsert.mockResolvedValue({
        id: 'test', weekNumber: 30, year: 2025, startDate: new Date(), endDate: new Date(),
        content: 'test', createdAt: new Date(), updatedAt: new Date()
      })

      await expect(
        dataService.createSnippet({
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Current week content'
        })
      ).resolves.toBeDefined()
    })

    it('should handle year boundary correctly', async () => {
      // Test with early year date
      jest.setSystemTime(new Date('2025-01-05T10:00:00.000Z')) // Week 2 of 2025

      mockPrisma.weeklySnippet.upsert.mockResolvedValue({
        id: 'test', weekNumber: 2, year: 2025, startDate: new Date(), endDate: new Date(),
        content: 'test', createdAt: new Date(), updatedAt: new Date()
      })

      await expect(
        dataService.createSnippet({
          weekNumber: 2, // Current week
          year: 2025,
          startDate: new Date('2025-01-05'),
          endDate: new Date('2025-01-05'),
          content: 'Current week content'
        })
      ).resolves.toBeDefined()

      await expect(
        dataService.createSnippet({
          weekNumber: 3, // Future week
          year: 2025,
          startDate: new Date('2025-01-12'),
          endDate: new Date('2025-01-16'),
          content: 'Future content'
        })
      ).rejects.toThrow('Cannot create snippets for future weeks')
    })
  })
})