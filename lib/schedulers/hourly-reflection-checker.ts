/**
 * Hourly Reflection Checker
 * 
 * Checks user preferences every hour to determine who should have
 * weekly reflections generated. Handles timezone conversion and
 * ensures users only get one reflection per week.
 */

import { createUserDataService } from '../user-scoped-data'
import { jobService } from '../job-processor/job-service'
import { AsyncOperationType, AsyncOperationStatus } from '../../types/async-operations'
import { startOfWeek, endOfWeek, getISOWeek } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    
    const dataService = createUserDataService(userId)
    
    try {
      // Check if already processing
      const existingOps = await dataService.getAsyncOperations()
      const inProgress = existingOps.find(
        (op: any) => 
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
      
      // TODO: Send notification if enabled
      if (preferences.notifyOnGeneration) {
        // await this.sendNotification(userId, operation.id)
      }
      
    } finally {
      await dataService.disconnect()
    }
  }

  /**
   * Get all users with auto-generation enabled
   */
  private async getUsersWithAutoGeneration(): Promise<any[]> {
    // For now, return all users since we use default preferences
    // TODO: In future, filter based on user preferences stored in separate table
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true
      }
    })
    
    return users
  }

  /**
   * Check if user should be processed at current time
   */
  private async shouldProcessUser(user: any): Promise<boolean> {
    const preferences = DEFAULT_PREFERENCES // Use default preferences for now
    
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
    // For now, return default preferences
    // TODO: Implement user preferences storage and retrieval
    return DEFAULT_PREFERENCES
  }

}

// Export singleton instance
export const hourlyReflectionChecker = new HourlyReflectionChecker()