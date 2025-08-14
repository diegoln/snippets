/**
 * Rich Data Seeding Service
 * 
 * Loads Jack Thompson's rich mock dataset into the database for consistent access
 * across development and staging environments. This service populates the
 * IntegrationData table with realistic calendar events, meeting transcripts,
 * and Google Docs data.
 */

import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { RichIntegrationDataService } from './rich-integration-data-service'
import { getISOWeek, setISOWeek, startOfISOWeek, endOfISOWeek } from 'date-fns'

export interface RichDataSeedingOptions {
  environment: 'development' | 'staging'
  userId: string // User ID to seed data for
  datasetName?: string // Dataset name to use (defaults to auto-detect based on userId)
  overwrite?: boolean // Whether to overwrite existing data
}

export class RichDataSeedingService {

  /**
   * Seed rich integration data into the database for a specific user
   */
  static async seedRichIntegrationData(
    options: RichDataSeedingOptions,
    prisma?: PrismaClient
  ): Promise<void> {
    const db = prisma || new PrismaClient()
    const shouldDisconnect = !prisma

    const { environment, userId, datasetName, overwrite = false } = options
    const targetUserId = userId

    console.log(`🌟 Seeding rich integration data for ${environment} environment...`)
    console.log(`   User ID: ${targetUserId}`)

    try {
      // Get available weeks for this user's dataset
      const availableWeeks = RichIntegrationDataService.getAvailableWeeks()
      
      let seedCount = 0
      
      for (const weekInfo of availableWeeks) {
        const { weekNumber, year } = weekInfo
        
        // Check if data already exists
        if (!overwrite) {
          const existing = await db.integrationData.findUnique({
            where: {
              userId_weekNumber_year_integrationType: {
                userId: targetUserId,
                weekNumber,
                year,
                integrationType: 'google_calendar'
              }
            }
          })
          
          if (existing) {
            console.log(`   ⏭️  Week ${weekNumber}, ${year} already exists, skipping`)
            continue
          }
        }

        // Create date range for the week
        const weekStart = this.getWeekStartDate(weekNumber, year)
        const weekEnd = this.getWeekEndDate(weekNumber, year)

        // Get rich data for this week
        const richData = await RichIntegrationDataService.getRichWeeklyData({
          weekStart,
          weekEnd,
          userId: targetUserId
        })

        if (!richData) {
          console.log(`   ⚠️  No rich data available for week ${weekNumber}, ${year}`)
          continue
        }

        // Prepare the data to store
        const integrationData = {
          userId: targetUserId,
          weekNumber,
          year,
          integrationType: 'google_calendar',
          rawData: {
            // Core calendar data
            totalMeetings: richData.totalMeetings,
            meetingContext: richData.meetingContext,
            keyMeetings: richData.keyMeetings,
            weeklyContextSummary: richData.weeklyContextSummary,
            
            // Rich data additions
            meetingTranscripts: richData.meetingTranscripts,
            meetingDocs: richData.meetingDocs,
            hasTranscripts: richData.hasTranscripts,
            hasDocs: richData.hasDocs,
            dataSource: richData.dataSource
          },
          metadata: {
            seedingEnvironment: environment,
            seedingTimestamp: new Date().toISOString(),
            dataVersion: '1.0',
            weekDateRange: {
              start: weekStart.toISOString(),
              end: weekEnd.toISOString()
            }
          }
        }

        // Store in database
        await db.integrationData.upsert({
          where: {
            userId_weekNumber_year_integrationType: {
              userId: targetUserId,
              weekNumber,
              year,
              integrationType: 'google_calendar'
            }
          },
          update: {
            rawData: integrationData.rawData as unknown as Prisma.InputJsonObject,
            metadata: integrationData.metadata as unknown as Prisma.InputJsonObject
          },
          create: {
            ...integrationData,
            rawData: integrationData.rawData as unknown as Prisma.InputJsonObject,
            metadata: integrationData.metadata as unknown as Prisma.InputJsonObject
          }
        })

        seedCount++
        console.log(`   ✅ Seeded week ${weekNumber}, ${year} (${richData.totalMeetings} meetings, ${richData.hasTranscripts ? 'with' : 'no'} transcripts)`)
      }

      console.log(`🎉 Successfully seeded ${seedCount} weeks of rich integration data`)

    } catch (error) {
      console.error('❌ Error seeding rich integration data:', error)
      throw error
    } finally {
      if (shouldDisconnect) {
        await db.$disconnect()
      }
    }
  }

  /**
   * Remove rich integration data for a user
   */
  static async clearRichIntegrationData(
    userId: string,
    prisma?: PrismaClient
  ): Promise<void> {
    const db = prisma || new PrismaClient()
    const shouldDisconnect = !prisma

    console.log(`🧹 Clearing rich integration data for user: ${userId}`)

    try {
      const deleted = await db.integrationData.deleteMany({
        where: {
          userId,
          integrationType: 'google_calendar'
        }
      })

      console.log(`✅ Cleared ${deleted.count} integration data records`)

    } catch (error) {
      console.error('❌ Error clearing rich integration data:', error)
      throw error
    } finally {
      if (shouldDisconnect) {
        await db.$disconnect()
      }
    }
  }

  /**
   * Get integration data from database for a specific week
   */
  static async getStoredIntegrationData(
    userId: string,
    weekNumber: number,
    year: number,
    prisma?: PrismaClient
  ): Promise<any | null> {
    const db = prisma || new PrismaClient()
    const shouldDisconnect = !prisma

    try {
      const data = await db.integrationData.findUnique({
        where: {
          userId_weekNumber_year_integrationType: {
            userId,
            weekNumber,
            year,
            integrationType: 'google_calendar'
          }
        }
      })

      return data?.rawData || null

    } catch (error) {
      console.error('Error retrieving stored integration data:', error)
      return null
    } finally {
      if (shouldDisconnect) {
        await db.$disconnect()
      }
    }
  }

  /**
   * List all stored integration data for a user
   */
  static async listStoredData(
    userId: string,
    prisma?: PrismaClient
  ): Promise<Array<{ weekNumber: number; year: number; hasTranscripts: boolean; hasDocs: boolean }>> {
    const db = prisma || new PrismaClient()
    const shouldDisconnect = !prisma

    try {
      const data = await db.integrationData.findMany({
        where: {
          userId,
          integrationType: 'google_calendar'
        },
        orderBy: [
          { year: 'asc' },
          { weekNumber: 'asc' }
        ]
      })

      return data.map(item => ({
        weekNumber: item.weekNumber,
        year: item.year,
        hasTranscripts: (item.rawData as any)?.hasTranscripts || false,
        hasDocs: (item.rawData as any)?.hasDocs || false
      }))

    } catch (error) {
      console.error('Error listing stored integration data:', error)
      return []
    } finally {
      if (shouldDisconnect) {
        await db.$disconnect()
      }
    }
  }

  /**
   * Calculate the start date of an ISO week
   */
  private static getWeekStartDate(weekNumber: number, year: number): Date {
    // Using a date in the target year ensures correct week calculation.
    // January 4th is always in week 1.
    const dateInTargetYear = new Date(year, 0, 4)
    const dateInTargetWeek = setISOWeek(dateInTargetYear, weekNumber)
    return startOfISOWeek(dateInTargetWeek)
  }

  /**
   * Calculate the end date of an ISO week (Friday)
   */
  private static getWeekEndDate(weekNumber: number, year: number): Date {
    const dateInTargetYear = new Date(year, 0, 4)
    const dateInTargetWeek = setISOWeek(dateInTargetYear, weekNumber)
    const weekEnd = endOfISOWeek(dateInTargetWeek)
    // Return Friday instead of Sunday (subtract 2 days)
    weekEnd.setDate(weekEnd.getDate() - 2)
    weekEnd.setHours(23, 59, 59, 999)
    return weekEnd
  }

  /**
   * Seed rich data for multiple users
   */
  static async seedRichDataForUsers(
    userIds: string[],
    environment: 'development' | 'staging',
    prisma?: PrismaClient
  ): Promise<void> {
    console.log(`🚀 Seeding rich data for ${userIds.length} users in ${environment}`)

    for (const userId of userIds) {
      try {
        await this.seedRichIntegrationData({
          environment,
          userId,
          overwrite: true
        }, prisma)
      } catch (error) {
        console.error(`⚠️  Failed to seed data for user ${userId}:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.log('✅ Rich data seeding completed for all users')
  }
}

// Export singleton instance
export const richDataSeedingService = new RichDataSeedingService()