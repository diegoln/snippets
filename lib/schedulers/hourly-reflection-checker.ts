/**
 * Hourly Reflection Checker
 * 
 * Checks user preferences every hour to determine who should have
 * weekly reflections generated. Handles timezone conversion and
 * ensures users only get one reflection per week.
 */

import { createUserDataService, UserScopedDataService } from '../user-scoped-data'
import { jobService } from '../job-processor/job-service'
import { AsyncOperationType, AsyncOperationStatus, AsyncOperation } from '../../types/async-operations'
import { startOfWeek, endOfWeek, getISOWeek } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'
import { PrismaClient } from '@prisma/client'

// Use singleton Prisma client to avoid multiple connections
let prismaClient: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient()
  }
  return prismaClient
}

interface User {
  id: string
  email: string
  reflectionPreferredDay: string
  reflectionPreferredHour: number
  reflectionTimezone: string
  reflectionNotifyOnGeneration: boolean
}

export interface UserReflectionPreferences {
  autoGenerate: boolean
  preferredDay: 'monday' | 'friday' | 'sunday'
  preferredHour: number // 0-23 in user's timezone
  timezone: string
  includeIntegrations?: string[]
  notifyOnGeneration?: boolean
}

const DEFAULT_PREFERENCES: UserReflectionPreferences = {
  autoGenerate: true,
  preferredDay: 'friday',
  preferredHour: 14, // 2 PM
  timezone: 'America/New_York',
  includeIntegrations: ['google_calendar'],
  notifyOnGeneration: false
}

export class HourlyReflectionChecker {
  /**
   * Check all users and process those whose preferred time matches
   */
  async checkAndProcessUsers(): Promise<void> {
    console.log('🔍 Starting hourly reflection check...')
    
    try {
      // Get all users with auto-generation enabled
      const users = await this.getUsersWithAutoGeneration()
      
      console.log(`Found ${users.length} users with auto-generation enabled`)
      
      let processed = 0
      let skipped = 0
      
      for (const user of users) {
        if (await this.shouldProcessUser(user)) {
          await this.processUser(user.id)
          processed++
        } else {
          skipped++
        }
      }
      
      console.log(`✅ Hourly check complete: ${processed} processed, ${skipped} skipped`)
      
    } catch (error) {
      console.error('❌ Hourly reflection check failed:', error)
      throw error
    }
  }

  /**
   * Process reflection generation for a specific user
   */
  async processUser(userId: string): Promise<void> {
    console.log(`📝 Processing reflection for user ${userId}`)
    
    let dataService: UserScopedDataService | null = null
    
    try {
      dataService = createUserDataService(userId)
      
      // Check if already processing
      const existingOps = await dataService.getAsyncOperations()
      const inProgress = existingOps.find(
        (op: AsyncOperation) => 
          op.operationType === AsyncOperationType.WEEKLY_REFLECTION &&
          op.status === AsyncOperationStatus.PROCESSING
      )
      
      if (inProgress) {
        console.log(`⏭️ User ${userId} already has reflection in progress`)
        return
      }
      
      // Get user preferences
      const preferences = await this.getUserPreferences(userId)
      
      // Determine week range
      const now = new Date()
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      
      // Create async operation
      const operation = await dataService.createAsyncOperation({
        operationType: AsyncOperationType.WEEKLY_REFLECTION,
        status: AsyncOperationStatus.QUEUED,
        inputData: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          includeIntegrations: preferences.includeIntegrations,
          includePreviousContext: true,
          automated: true
        },
        metadata: {
          triggerType: 'scheduled',
          timezone: preferences.timezone,
          preferredTime: `${preferences.preferredDay} ${preferences.preferredHour}:00`
        }
      })
      
      // Process the job
      await jobService.processJob(
        'weekly_reflection_generation',
        userId,
        operation.id,
        {
          userId,
          weekStart,
          weekEnd,
          includeIntegrations: preferences.includeIntegrations,
          includePreviousContext: true
        }
      )
      
      console.log(`✅ Reflection job started for user ${userId}`)
      
      // Send notification if enabled (placeholder for future implementation)
      if (preferences.notifyOnGeneration) {
        console.log(`📧 Notification would be sent to user ${userId} (feature not yet implemented)`)
        // Future: await this.sendNotification(userId, operation.id)
      }
      
    } finally {
      if (dataService) {
        await dataService.disconnect()
      }
    }
  }

  /**
   * Get all users with auto-generation enabled
   */
  private async getUsersWithAutoGeneration(): Promise<User[]> {
    const prisma = getPrismaClient()
    const users = await prisma.user.findMany({
      where: {
        reflectionAutoGenerate: true
      },
      select: {
        id: true,
        email: true,
        reflectionPreferredDay: true,
        reflectionPreferredHour: true,
        reflectionTimezone: true,
        reflectionNotifyOnGeneration: true
      }
    })
    
    return users as any[]
  }

  /**
   * Check if user should be processed at current time
   */
  private async shouldProcessUser(user: User): Promise<boolean> {
    const preferences: UserReflectionPreferences = {
      autoGenerate: true, // Already filtered in getUsersWithAutoGeneration
      preferredDay: user.reflectionPreferredDay as any,
      preferredHour: user.reflectionPreferredHour,
      timezone: user.reflectionTimezone,
      includeIntegrations: [], // Will be fetched during processing
      notifyOnGeneration: user.reflectionNotifyOnGeneration
    }
    
    // Check if it's the right day and time
    if (!this.isPreferredTime(preferences)) {
      return false
    }
    
    // Check if already has reflection for this week
    const hasReflection = await this.hasReflectionThisWeek(user.id)
    if (hasReflection) {
      console.log(`User ${user.id} already has reflection for this week`)
      return false
    }
    
    return true
  }

  /**
   * Check if current time matches user's preferred time
   */
  private isPreferredTime(preferences: UserReflectionPreferences): boolean {
    const now = new Date()
    
    // Convert current UTC time to user's timezone
    const userTime = toZonedTime(now, preferences.timezone)
    
    // Check day of week (0 = Sunday, 1 = Monday, 5 = Friday)
    const dayMap = {
      'sunday': 0,
      'monday': 1,
      'friday': 5
    }
    
    const currentDay = userTime.getDay()
    const preferredDayNum = dayMap[preferences.preferredDay]
    
    if (currentDay !== preferredDayNum) {
      return false
    }
    
    // Check hour
    const currentHour = userTime.getHours()
    if (currentHour !== preferences.preferredHour) {
      return false
    }
    
    return true
  }

  /**
   * Check if user already has a reflection for current week
   */
  private async hasReflectionThisWeek(userId: string): Promise<boolean> {
    const currentWeek = getISOWeek(new Date())
    const currentYear = new Date().getFullYear()
    
    const prisma = getPrismaClient()
    const reflection = await prisma.weeklySnippet.findUnique({
      where: {
        userId_year_weekNumber: {
          userId,
          year: currentYear,
          weekNumber: currentWeek
        }
      }
    })
    
    return reflection !== null
  }

  /**
   * Get user's reflection preferences
   */
  private async getUserPreferences(userId: string): Promise<UserReflectionPreferences> {
    const prisma = getPrismaClient()
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        reflectionAutoGenerate: true,
        reflectionPreferredDay: true,
        reflectionPreferredHour: true,
        reflectionTimezone: true,
        reflectionIncludeIntegrations: true,
        reflectionNotifyOnGeneration: true
      }
    })

    if (!user) {
      return DEFAULT_PREFERENCES
    }

    return {
      autoGenerate: user.reflectionAutoGenerate,
      preferredDay: user.reflectionPreferredDay as any,
      preferredHour: user.reflectionPreferredHour,
      timezone: user.reflectionTimezone,
      includeIntegrations: Array.isArray(user.reflectionIncludeIntegrations) 
        ? user.reflectionIncludeIntegrations as string[]
        : [],
      notifyOnGeneration: user.reflectionNotifyOnGeneration
    }
  }

}

// Export singleton instance
export const hourlyReflectionChecker = new HourlyReflectionChecker()