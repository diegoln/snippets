/**
 * In-Memory Job Processor - Development Implementation
 * 
 * Processes jobs immediately using an in-memory queue.
 * Perfect for development and testing environments.
 */

import { JobProcessor, JobRequest, JobResult } from '../types'
import { jobService } from '../job-service'

export class InMemoryProcessor implements JobProcessor {
  private queue: JobRequest[] = []
  private processing = false

  async enqueue(job: JobRequest): Promise<void> {
    console.log(`📥 [DEV] Enqueueing job: ${job.type}`)
    this.queue.push(job)
    
    // Process queue if not already processing
    if (!this.processing) {
      setImmediate(() => this.processQueue())
    }
  }

  async processImmediate(job: JobRequest): Promise<JobResult> {
    console.log(`⚡ [DEV] Processing job immediately: ${job.type}`)
    return await jobService.processJob(
      job.type,
      job.userId,
      job.operationId,
      job.inputData
    )
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!
        
        console.log(`🔄 [DEV] Processing queued job: ${job.type}`)
        
        // Add small delay to simulate real queue behavior
        await new Promise(resolve => setTimeout(resolve, 500))
        
        try {
          await jobService.processJob(
            job.type,
            job.userId,
            job.operationId,
            job.inputData
          )
        } catch (error) {
          console.error(`❌ [DEV] Failed to process job ${job.type}:`, error)
        }
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * Get current queue status (useful for debugging)
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      jobs: this.queue.map(job => ({
        type: job.type,
        userId: job.userId,
        operationId: job.operationId
      }))
    }
  }
}