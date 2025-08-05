/**
 * Job Processor - Main Entry Point
 * 
 * Provides environment-aware job processing with automatic processor selection
 * and handler registration. Use this as the main interface for job processing.
 */

import { JobProcessor, JobRequest } from './types'
import { jobHandlerRegistry, jobService } from './job-service'
import { InMemoryProcessor } from './processors/in-memory-processor'
import { CloudTasksProcessor } from './processors/cloud-tasks-processor'
import { CareerGuidelinesHandler } from './handlers/career-guidelines-handler'

// Register all job handlers
jobHandlerRegistry.register(new CareerGuidelinesHandler())

/**
 * Get the appropriate job processor for the current environment
 */
function createJobProcessor(): JobProcessor {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    // Production: Use Cloud Tasks (when implemented)
    try {
      return new CloudTasksProcessor({
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'advanceweekly-prod',
        location: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
        queueName: process.env.CLOUD_TASKS_QUEUE || 'job-queue'
      })
    } catch (error) {
      console.warn('⚠️ Cloud Tasks not available, falling back to in-memory processor')
      return new InMemoryProcessor()
    }
  } else {
    // Development: Use in-memory processor
    return new InMemoryProcessor()
  }
}

// Create singleton processor instance
export const jobProcessor = createJobProcessor()

/**
 * Enqueue a job for processing
 */
export async function enqueueJob(job: JobRequest): Promise<void> {
  await jobProcessor.enqueue(job)
}

/**
 * Process a job immediately (useful for testing)
 */
export async function processJobImmediate(job: JobRequest) {
  if (jobProcessor.processImmediate) {
    return await jobProcessor.processImmediate(job)
  } else {
    // Fallback: enqueue and let it process naturally
    await jobProcessor.enqueue(job)
    return { success: true, message: 'Job enqueued for processing' }
  }
}

// Export everything needed by consumers
export { jobService, jobHandlerRegistry }
export * from './types'
export * from './handlers/career-guidelines-handler'