/**
 * Rich Data Seeding Tests
 * 
 * Tests for the rich data seeding service
 */

import { RichDataSeedingService } from '../lib/rich-data-seeding-service'
import { PrismaClient } from '@prisma/client'

// Mock Prisma client
const mockFindUnique = jest.fn()
const mockUpsert = jest.fn()
const mockDeleteMany = jest.fn()
const mockFindMany = jest.fn()
const mockDisconnect = jest.fn()

const mockPrisma = {
  integrationData: {
    findUnique: mockFindUnique,
    upsert: mockUpsert,
    deleteMany: mockDeleteMany,
    findMany: mockFindMany
  },
  $disconnect: mockDisconnect
} as unknown as PrismaClient

// Mock the rich integration data service
jest.mock('../lib/rich-integration-data-service', () => ({
  RichIntegrationDataService: {
    getAvailableWeeks: jest.fn().mockReturnValue([
      { weekNumber: 40, year: 2024, dateRange: 'Oct 1-4, 2024' },
      { weekNumber: 41, year: 2024, dateRange: 'Oct 8-11, 2024' }
    ]),
    getRichWeeklyData: jest.fn().mockResolvedValue({
      totalMeetings: 2,
      meetingContext: ['Meeting 1', 'Meeting 2'],
      keyMeetings: [],
      weeklyContextSummary: 'Test summary',
      meetingTranscripts: [],
      meetingDocs: [],
      hasTranscripts: false,
      hasDocs: false,
      weekNumber: 40,
      year: 2024,
      dataSource: 'jack-thompson-oct-2024'
    })
  }
}))

describe('RichDataSeedingService', () => {
  beforeEach(() => {
    // Clear all mock calls and implementations
    mockFindUnique.mockReset()
    mockUpsert.mockReset()
    mockDeleteMany.mockReset()
    mockFindMany.mockReset()
    mockDisconnect.mockReset()
  })

  describe('seedRichIntegrationData', () => {
    test('seeds rich data for development environment', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockUpsert.mockResolvedValue({ id: 'test-id' })

      await RichDataSeedingService.seedRichIntegrationData({
        environment: 'development',
        userId: 'jack@company.com'
      }, mockPrisma)

      expect(mockUpsert).toHaveBeenCalledTimes(2) // 2 weeks available
      
      const upsertCall = mockUpsert.mock.calls[0][0]
      expect(upsertCall.create.userId).toBe('jack@company.com')
      expect(upsertCall.create.integrationType).toBe('google_calendar')
      expect(upsertCall.create.rawData.dataSource).toBe('jack-thompson-oct-2024')
    })

    test('skips existing data when overwrite is false', async () => {
      mockFindUnique.mockResolvedValue({ id: 'existing' })

      await RichDataSeedingService.seedRichIntegrationData({
        environment: 'development',
        overwrite: false
      }, mockPrisma)

      expect(mockUpsert).not.toHaveBeenCalled()
    })

    test('overwrites existing data when overwrite is true', async () => {
      mockFindUnique.mockResolvedValue({ id: 'existing' })
      mockUpsert.mockResolvedValue({ id: 'updated' })

      await RichDataSeedingService.seedRichIntegrationData({
        environment: 'staging',
        overwrite: true
      }, mockPrisma)

      expect(mockUpsert).toHaveBeenCalledTimes(2)
    })

    test('includes proper metadata in seeded data', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockUpsert.mockResolvedValue({ id: 'test-id' })

      await RichDataSeedingService.seedRichIntegrationData({
        environment: 'staging'
      }, mockPrisma)

      const upsertCall = mockUpsert.mock.calls[0][0]
      expect(upsertCall.create.metadata.seedingEnvironment).toBe('staging')
      expect(upsertCall.create.metadata.dataVersion).toBe('1.0')
      expect(upsertCall.create.metadata.seedingTimestamp).toBeDefined()
    })
  })

  describe('clearRichIntegrationData', () => {
    test('clears integration data for specified user', async () => {
      mockDeleteMany.mockResolvedValue({ count: 5 })

      await RichDataSeedingService.clearRichIntegrationData('jack@company.com', mockPrisma)

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'jack@company.com',
          integrationType: 'google_calendar'
        }
      })
    })
  })

  describe('getStoredIntegrationData', () => {
    test('retrieves stored data for specific week', async () => {
      const mockStoredData = {
        rawData: {
          totalMeetings: 3,
          hasTranscripts: true,
          dataSource: 'jack-thompson-oct-2024'
        }
      };
      
      mockFindUnique.mockResolvedValue(mockStoredData)

      const result = await RichDataSeedingService.getStoredIntegrationData(
        'jack@company.com',
        40,
        2024,
        mockPrisma
      )

      expect(result).toEqual(mockStoredData.rawData)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          userId_weekNumber_year_integrationType: {
            userId: 'jack@company.com',
            weekNumber: 40,
            year: 2024,
            integrationType: 'google_calendar'
          }
        }
      })
    })

    test('returns null when no data found', async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await RichDataSeedingService.getStoredIntegrationData(
        'unknown@company.com',
        40,
        2024,
        mockPrisma
      )

      expect(result).toBeNull()
    })
  })

  describe('listStoredData', () => {
    test('returns list of stored weeks with metadata', async () => {
      const mockStoredData = [
        {
          weekNumber: 40,
          year: 2024,
          rawData: { hasTranscripts: true, hasDocs: false }
        },
        {
          weekNumber: 41,
          year: 2024,
          rawData: { hasTranscripts: false, hasDocs: true }
        }
      ];

      mockFindMany.mockResolvedValue(mockStoredData)

      const result = await RichDataSeedingService.listStoredData('jack@company.com', mockPrisma)

      expect(result).toEqual([
        { weekNumber: 40, year: 2024, hasTranscripts: true, hasDocs: false },
        { weekNumber: 41, year: 2024, hasTranscripts: false, hasDocs: true }
      ])
    })
  })

  describe('seedRichDataForUsers', () => {
    test('seeds data for multiple users', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockUpsert.mockResolvedValue({ id: 'test-id' })

      const seedSpy = jest.spyOn(RichDataSeedingService, 'seedRichIntegrationData')

      await RichDataSeedingService.seedRichDataForUsers(['1', 'jack@company.com'], 'development', mockPrisma)

      // Should call seedRichIntegrationData for each user
      expect(seedSpy).toHaveBeenCalledTimes(2)
      expect(seedSpy).toHaveBeenCalledWith(
        { environment: 'development', userId: '1', overwrite: true },
        mockPrisma
      )
      expect(seedSpy).toHaveBeenCalledWith(
        { environment: 'development', userId: 'jack@company.com', overwrite: true },
        mockPrisma
      )
    })
  })
})