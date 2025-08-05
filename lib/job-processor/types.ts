/**
 * Job Processing Types - Environment-agnostic interfaces
 * 
 * Defines the contract for job processing that works identically
 * across development, staging, and production environments.
 */

export interface JobRequest {
  type: string
  userId: string
  operationId: string
  inputData: any
  metadata?: {
    priority?: 'low' | 'medium' | 'high'
    estimatedDuration?: number
    retryAttempts?: number
  }
}

export interface JobResult {
  success: boolean
  data?: any
  error?: string
  metadata?: any
}

export interface JobProcessor {
  /**
   * Queue a job for processing
   */
  enqueue(job: JobRequest): Promise<void>
  
  /**
   * Process a job immediately (for testing/development)
   */
  processImmediate?(job: JobRequest): Promise<JobResult>
}

export interface JobHandler<TInput = any, TOutput = any> {
  /**
   * Process job with pure business logic
   * No infrastructure concerns - works identically in all environments
   */
  process(input: TInput, context: JobContext): Promise<TOutput>
  
  /**
   * Job type identifier
   */
  readonly jobType: string
  
  /**
   * Estimated processing time in seconds
   */
  readonly estimatedDuration: number
}

export interface JobContext {
  userId: string
  operationId: string
  updateProgress: (progress: number, message?: string) => Promise<void>
  metadata?: any
}

/**
 * Registry of all job handlers
 */
export interface JobHandlerRegistry {
  register<T extends JobHandler>(handler: T): void
  get(jobType: string): JobHandler | undefined
  getAll(): JobHandler[]
}