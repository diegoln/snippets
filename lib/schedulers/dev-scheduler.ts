/**
 * Development Environment Scheduler
 * 
 * Simulates production scheduling behavior in development.
 * Uses node-cron for scheduling but can also be triggered manually.
 */

import * as cron from 'node-cron'
import { HourlyReflectionChecker } from './hourly-reflection-checker'

export class DevScheduler {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map()
  private reflectionChecker: HourlyReflectionChecker
  
  constructor() {
    this.reflectionChecker = new HourlyReflectionChecker()
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    console.log('🚀 Starting development scheduler...')
    
    // Schedule hourly reflection checks
    // In dev, we might want to run more frequently for testing
    const frequency = process.env.DEV_SCHEDULER_FREQUENCY || '0 * * * *' // Every hour by default
    
    const reflectionJob = cron.schedule(frequency, async () => {
      console.log('⏰ Running scheduled reflection check...')
      try {
        await this.reflectionChecker.checkAndProcessUsers()
      } catch (error) {
        console.error('Scheduled reflection check failed:', error)
      }
    })
    
    this.cronJobs.set('reflection-checker', reflectionJob)
    
    console.log(`✅ Development scheduler started (frequency: ${frequency})`)
    console.log('💡 Tip: Set DEV_SCHEDULER_FREQUENCY env var to change frequency')
    console.log('💡 Example: DEV_SCHEDULER_FREQUENCY="*/5 * * * *" for every 5 minutes')
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 Stopping development scheduler...')
    
    this.cronJobs.forEach((job, name) => {
      job.stop()
      console.log(`  - Stopped ${name}`)
    })
    
    this.cronJobs.clear()
  }

  /**
   * Manually trigger reflection check
   */
  async triggerReflectionCheck() {
    console.log('🔧 Manually triggering reflection check...')
    await this.reflectionChecker.checkAndProcessUsers()
  }

  /**
   * Manually trigger reflection for specific user
   */
  async triggerUserReflection(userId: string) {
    console.log(`🔧 Manually triggering reflection for user ${userId}...`)
    await this.reflectionChecker.processUser(userId)
  }

  /**
   * Get status of scheduled jobs
   */
  getStatus() {
    const status: Record<string, boolean> = {}
    
    this.cronJobs.forEach((job, name) => {
      // node-cron doesn't have a direct running property, but we can check if it exists
      status[name] = job !== undefined
    })
    
    return {
      running: this.cronJobs.size > 0,
      jobs: status,
      nextCheck: this.getNextScheduledTime()
    }
  }

  /**
   * Calculate next scheduled time (approximation)
   */
  private getNextScheduledTime(): Date | null {
    // For hourly schedule, next run is at the top of the next hour
    const now = new Date()
    const next = new Date(now)
    next.setHours(now.getHours() + 1, 0, 0, 0)
    return next
  }
}

// Create singleton instance for development
let devScheduler: DevScheduler | null = null

export function getDevScheduler(): DevScheduler {
  if (!devScheduler) {
    devScheduler = new DevScheduler()
  }
  return devScheduler
}

// Auto-start scheduler in development if enabled
if (process.env.NODE_ENV === 'development' && process.env.AUTO_START_SCHEDULER === 'true') {
  const scheduler = getDevScheduler()
  scheduler.start()
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development scheduler...')
    scheduler.stop()
    process.exit(0)
  })
}

// Export manual trigger functions for testing
export async function manualTriggerReflectionCheck() {
  const scheduler = getDevScheduler()
  await scheduler.triggerReflectionCheck()
}

export async function manualTriggerUserReflection(userId: string) {
  const scheduler = getDevScheduler()
  await scheduler.triggerUserReflection(userId)
}