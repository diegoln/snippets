/**
 * Types for async operations and background job processing
 */

export enum AsyncOperationType {
  CAREER_PLAN_GENERATION = 'career_plan_generation',
  WEEKLY_ANALYSIS = 'weekly_analysis',
  PERFORMANCE_ASSESSMENT = 'performance_assessment',
  INTEGRATION_SYNC = 'integration_sync',
  BULK_DATA_EXPORT = 'bulk_data_export'
}

export enum AsyncOperationStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface AsyncOperation {
  id: string
  userId: string
  operationType: AsyncOperationType
  status: AsyncOperationStatus
  progress: number // 0-100
  inputData?: any
  resultData?: any
  errorMessage?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number // seconds
  metadata: any
}

export interface CareerPlanGenerationInput {
  role: string
  level: string
  companyLadder?: string
}

export interface CareerPlanGenerationResult {
  currentLevelPlan: string
  nextLevelExpectations: string
  generatedAt: Date
}

export interface CreateAsyncOperationRequest {
  operationType: AsyncOperationType
  inputData: any
  estimatedDuration?: number
  metadata?: any
}

export interface AsyncOperationStatusResponse {
  operation: AsyncOperation
  isComplete: boolean
  timeRemaining?: number // estimated seconds remaining
}