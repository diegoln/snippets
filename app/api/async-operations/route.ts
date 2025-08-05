import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../lib/dev-auth'
import { createUserDataService } from '../../../lib/user-scoped-data'
import { enqueueJob } from '../../../lib/job-processor'
import { 
  AsyncOperationType, 
  AsyncOperationStatus, 
  CreateAsyncOperationRequest 
} from '../../../types/async-operations'

/**
 * POST /api/async-operations - Create a new async operation
 */
export async function POST(request: NextRequest) {
  try {
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

    const body: CreateAsyncOperationRequest = await request.json()
    const { operationType, inputData, estimatedDuration, metadata } = body

    // Validate operation type
    if (!Object.values(AsyncOperationType).includes(operationType)) {
      return NextResponse.json(
        { error: 'Invalid operation type' },
        { status: 400 }
      )
    }

    // Create async operation record
    const dataService = createUserDataService(userId)
    
    try {
      const operation = await dataService.createAsyncOperation({
        operationType,
        status: AsyncOperationStatus.QUEUED,
        inputData,
        estimatedDuration: estimatedDuration || 30,
        metadata: metadata || {}
      })

      // Enqueue the job for processing using the new robust system
      await enqueueJob({
        type: operationType,
        userId,
        operationId: operation.id,
        inputData,
        metadata
      })

      console.log(`🚀 Created async operation: ${operationType} for user ${userId}`)

      return NextResponse.json({
        operationId: operation.id,
        status: operation.status,
        estimatedDuration: operation.estimatedDuration,
        createdAt: operation.createdAt
      })

    } finally {
      await dataService.disconnect()
    }

  } catch (error) {
    console.error('Error creating async operation:', error)
    return NextResponse.json(
      { error: 'Failed to create async operation' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/async-operations - Get user's async operations
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const operationType = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')

    const dataService = createUserDataService(userId)
    
    try {
      const operations = await dataService.getAsyncOperations({
        operationType: operationType as AsyncOperationType,
        status: status as AsyncOperationStatus,
        limit
      })

      return NextResponse.json({
        operations: operations.map(op => ({
          id: op.id,
          operationType: op.operationType,
          status: op.status,
          progress: op.progress,
          createdAt: op.createdAt,
          startedAt: op.startedAt,
          completedAt: op.completedAt,
          estimatedDuration: op.estimatedDuration,
          errorMessage: op.errorMessage
        }))
      })

    } finally {
      await dataService.disconnect()
    }

  } catch (error) {
    console.error('Error fetching async operations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch async operations' },
      { status: 500 }
    )
  }
}