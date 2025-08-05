/**
 * Unified Job Processing Service
 * 
 * Provides consistent job processing with progress tracking, error handling,
 * and persistence across all environments. Environment-agnostic business logic.
 */

import { JobHandler, JobContext, JobResult, JobHandlerRegistry } from './types'
import { createUserDataService } from '../user-scoped-data'
import { 
  AsyncOperationStatus,
  AsyncOperationType 
} from '../../types/async-operations'

export class JobService {
  constructor(private handlerRegistry: JobHandlerRegistry) {}

  /**
   * Process a job with full progress tracking and error handling
   */
  async processJob(
    jobType: string,
    userId: string,
    operationId: string,
    inputData: any
  ): Promise<JobResult> {
    const dataService = createUserDataService(userId)
    
    try {
      // Get the appropriate handler
      const handler = this.handlerRegistry.get(jobType)
      if (!handler) {
        throw new Error(`No handler registered for job type: ${jobType}`)
      }

      console.log(`🔄 Processing job ${jobType} for user ${userId}, operation ${operationId}`)

      // Update operation status to processing
      await dataService.updateAsyncOperation(operationId, {
        status: AsyncOperationStatus.PROCESSING,
        progress: 0,
        startedAt: new Date()
      })

      // Create progress update function
      const updateProgress = async (progress: number, message?: string) => {
        await dataService.updateAsyncOperation(operationId, {
          progress: Math.min(100, Math.max(0, progress)),
          ...(message && { 
            metadata: { 
              currentStep: message,
              lastUpdated: new Date().toISOString()
            }
          })
        })
      }

      // Create job context
      const context: JobContext = {
        userId,
        operationId,
        updateProgress,
        metadata: { jobType }
      }

      // Process the job
      const result = await handler.process(inputData, context)

      // Save result to user profile if it's a career plan
      if (jobType === 'career_plan_generation' && result) {
        await dataService.updateUserProfile({
          careerProgressionPlan: result.currentLevelPlan,
          nextLevelExpectations: result.nextLevelExpectations,
          careerPlanGeneratedAt: new Date()
        })
      }

      // Complete the operation
      await dataService.updateAsyncOperation(operationId, {
        status: AsyncOperationStatus.COMPLETED,
        progress: 100,
        resultData: result,
        completedAt: new Date()
      })

      console.log(`✅ Job ${jobType} completed successfully for user ${userId}`)

      return {
        success: true,
        data: result,
        metadata: { 
          jobType,
          completedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error(`❌ Job ${jobType} failed for user ${userId}:`, error)
      
      // Update operation status to failed
      await dataService.updateAsyncOperation(operationId, {
        status: AsyncOperationStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { 
          jobType,
          failedAt: new Date().toISOString()
        }
      }
    } finally {
      await dataService.disconnect()
    }
  }
}

/**
 * Simple handler registry implementation
 */
export class SimpleJobHandlerRegistry implements JobHandlerRegistry {
  private handlers = new Map<string, JobHandler>()

  register<T extends JobHandler>(handler: T): void {
    this.handlers.set(handler.jobType, handler)
    console.log(`📝 Registered job handler: ${handler.jobType}`)
  }

  get(jobType: string): JobHandler | undefined {
    return this.handlers.get(jobType)
  }

  getAll(): JobHandler[] {
    return Array.from(this.handlers.values())
  }
}

// Create singleton instances
export const jobHandlerRegistry = new SimpleJobHandlerRegistry()
export const jobService = new JobService(jobHandlerRegistry)