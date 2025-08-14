/**
 * Weekly Reflection Job API
 * 
 * Endpoint for triggering weekly reflection generation jobs.
 * Can be called by:
 * - Cloud Scheduler (production)
 * - Hourly checker service
 * - Manual user trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService, UserScopedDataService } from '../../../../lib/user-scoped-data'
import { jobService } from '../../../../lib/job-processor/job-service'
import { AsyncOperationStatus, AsyncOperationType, AsyncOperation } from '../../../../types/async-operations'
import { startOfWeek, endOfWeek } from 'date-fns'

// Input validation schema
const WeeklyReflectionJobSchema = z.object({
  userId: z.string().optional(), // Admin can specify user
  weekStart: z.string().optional(), // ISO date string
  weekEnd: z.string().optional(), // ISO date string
  includeIntegrations: z.array(z.string()).optional(),
  includePreviousContext: z.boolean().optional().default(true),
  manual: z.boolean().optional().default(false), // Track if manually triggered
  testMode: z.boolean().optional().default(false) // Use mock data for testing
})

/**
 * POST /api/jobs/weekly-reflection
 * 
 * Trigger weekly reflection generation for a user
 */
export async function POST(request: NextRequest) {
  let dataService: UserScopedDataService | null = null

  try {
    // Get authenticated user
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const validationResult = WeeklyReflectionJobSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const input = validationResult.data

    // Determine target user (allow admin override in future)
    const targetUserId = input.userId || userId
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      )
    }

    // Verify user exists and has necessary data
    dataService = createUserDataService(targetUserId)
    
    const userProfile = await dataService.getUserProfile()
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check for existing in-progress operation
    const existingOps = await dataService.getAsyncOperations()
    const inProgress = existingOps.find(
      (op: AsyncOperation) => 
        op.operationType === AsyncOperationType.WEEKLY_REFLECTION &&
        op.status === AsyncOperationStatus.PROCESSING
    )

    if (inProgress) {
      return NextResponse.json({
        operationId: inProgress.id,
        status: 'already_processing',
        message: 'A weekly reflection is already being generated'
      })
    }

    // Determine week range
    const weekEnd = input.weekEnd 
      ? new Date(input.weekEnd) 
      : endOfWeek(new Date(), { weekStartsOn: 1 })
    const weekStart = input.weekStart 
      ? new Date(input.weekStart)
      : startOfWeek(weekEnd, { weekStartsOn: 1 })

    // Create async operation for tracking
    const operation = await dataService.createAsyncOperation({
      operationType: AsyncOperationType.WEEKLY_REFLECTION,
      status: AsyncOperationStatus.QUEUED,
      inputData: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        includeIntegrations: input.includeIntegrations,
        includePreviousContext: input.includePreviousContext,
        manual: input.manual,
        testMode: input.testMode
      },
      metadata: {
        triggerType: input.manual ? (input.testMode ? 'test' : 'manual') : 'scheduled',
        requestedAt: new Date().toISOString(),
        testMode: input.testMode
      }
    })

    // Process the job
    // In production, this would be enqueued to Cloud Tasks
    // For now, process directly
    const jobPromise = jobService.processJob(
      'weekly_reflection_generation',
      targetUserId,
      operation.id,
      {
        userId: targetUserId,
        weekStart,
        weekEnd,
        includeIntegrations: input.includeIntegrations,
        includePreviousContext: input.includePreviousContext,
        testMode: input.testMode
      }
    )

    // Don't wait for completion in production
    if (process.env.NODE_ENV === 'production') {
      // Fire and forget
      jobPromise.catch(error => {
        console.error('Weekly reflection job failed:', error)
      })
    } else {
      // In development, optionally wait
      if (request.headers.get('X-Wait-For-Completion') === 'true') {
        await jobPromise
      }
    }

    return NextResponse.json({
      success: true,
      operationId: operation.id,
      status: 'processing',
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      message: 'Weekly reflection generation started'
    })

  } catch (error) {
    console.error('Failed to start weekly reflection job:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start reflection generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (dataService) {
      await dataService.disconnect()
    }
  }
}

/**
 * GET /api/jobs/weekly-reflection
 * 
 * Check status of weekly reflection jobs
 */
export async function GET(request: NextRequest) {
  let dataService: UserScopedDataService | null = null

  try {
    // Get authenticated user
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get operation ID from query params
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')

    dataService = createUserDataService(userId)
    
    if (operationId) {
      // Get specific operation
      const operation = await dataService.getAsyncOperation(operationId)
      if (!operation) {
        return NextResponse.json(
          { error: 'Operation not found' },
          { status: 404 }
        )
      }

      // Parse metadata if it exists
      let parsedMetadata = operation.metadata
      try {
        if (typeof operation.metadata === 'string') {
          parsedMetadata = JSON.parse(operation.metadata)
        }
      } catch (error) {
        console.warn(`Failed to parse metadata for operation ${operation.id}:`, error)
        // Keep original metadata if parsing fails
      }

      return NextResponse.json({
        operationId: operation.id,
        status: operation.status,
        progress: operation.progress,
        resultData: operation.resultData,
        errorMessage: operation.errorMessage,
        createdAt: operation.createdAt,
        completedAt: operation.completedAt,
        metadata: parsedMetadata
      })
    } else {
      // Get all weekly reflection operations
      const operations = await dataService.getAsyncOperations()
      const reflectionOps = operations.filter(
        (op: AsyncOperation) => op.operationType === AsyncOperationType.WEEKLY_REFLECTION
      )

      return NextResponse.json({
        operations: reflectionOps.map((op: AsyncOperation) => {
          // Parse metadata if it exists
          let parsedMetadata = op.metadata
          try {
            if (typeof op.metadata === 'string') {
              parsedMetadata = JSON.parse(op.metadata)
            }
          } catch (error) {
            console.warn(`Failed to parse metadata for operation ${op.id}:`, error)
            // Keep original metadata if parsing fails
          }

          return {
            operationId: op.id,
            status: op.status,
            progress: op.progress,
            createdAt: op.createdAt,
            completedAt: op.completedAt,
            metadata: parsedMetadata
          }
        })
      })
    }

  } catch (error) {
    console.error('Failed to get reflection job status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (dataService) {
      await dataService.disconnect()
    }
  }
}