/**
 * Unit tests for UserScopedDataService snippet operations
 * Focuses on future week validation and snippet management
 */

import { UserScopedDataService } from '../user-scoped-data'

// Mock Prisma with all required methods
const mockPrisma = {
  reflection: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn()
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
      const mockReflection = {
        id: 'reflection-id',
        weekNumber: 30,
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Test content',
        type: 'weekly',
        sourceIntegrationType: null,
        consolidationId: null,
        generatedFromConsolidation: false,
        aiSuggestions: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.reflection.upsert.mockResolvedValue(mockReflection)

      const result = await dataService.createSnippet({
        weekNumber: 30,
        year: 2025,
        startDate: new Date('2025-07-21'),
        endDate: new Date('2025-07-25'),
        content: 'Test content'
      })

      expect(mockPrisma.reflection.upsert).toHaveBeenCalledWith({
        where: {
          userId_year_weekNumber_type: {
            userId: 'test-user-id',
            year: 2025,
            weekNumber: 30,
            type: 'weekly'
          }
        },
        create: {
          weekNumber: 30,
          year: 2025,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          content: 'Test content',
          userId: 'test-user-id',
          type: 'weekly'
        },
        update: {
          content: 'Test content',
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          sourceIntegrationType: undefined,
          consolidationId: undefined,
          generatedFromConsolidation: false,
          aiSuggestions: undefined,
          updatedAt: expect.any(Date)
        },
        select: {
          id: true,
          weekNumber: true,
          year: true,
          startDate: true,
          endDate: true,
          content: true,
          type: true,
          sourceIntegrationType: true,
          consolidationId: true,
          generatedFromConsolidation: true,
          aiSuggestions: true,
          createdAt: true,
          updatedAt: true
        }
      })

      expect(result).toEqual(mockReflection)
    })

    it('should create snippet for past week successfully', async () => {
      const mockReflection = {
        id: 'reflection-past',
        weekNumber: 29,
        year: 2025,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        content: 'Past week content',
        type: 'weekly',
        sourceIntegrationType: null,
        consolidationId: null,
        generatedFromConsolidation: false,
        aiSuggestions: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.reflection.upsert.mockResolvedValue(mockReflection)

      const result = await dataService.createSnippet({
        weekNumber: 29, // Past week
        year: 2025,
        startDate: new Date('2025-07-14'),
        endDate: new Date('2025-07-18'),
        content: 'Past week content'
      })

      expect(result.weekNumber).toBe(29)
      expect(mockPrisma.reflection.upsert).toHaveBeenCalled()
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
      ).rejects.toThrow('Cannot create reflections for future weeks')

      expect(mockPrisma.reflection.upsert).not.toHaveBeenCalled()
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
      ).rejects.toThrow('Cannot create reflections for future weeks')

      expect(mockPrisma.reflection.upsert).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.reflection.upsert.mockRejectedValue(new Error('Database connection failed'))

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
      mockPrisma.reflection.upsert.mockRejectedValue(originalError)

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
      ).rejects.toThrow('Cannot create reflections for future weeks')

      // Week 30 should be allowed
      mockPrisma.reflection.upsert.mockResolvedValue({
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

      mockPrisma.reflection.upsert.mockResolvedValue({
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
      ).rejects.toThrow('Cannot create reflections for future weeks')
    })
  })
})