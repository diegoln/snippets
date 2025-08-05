import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService } from '../../../../lib/user-scoped-data'

/**
 * GET /api/async-operations/[operationId] - Get specific async operation status
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { operationId: string } }
) {
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

    const { operationId } = params
    const dataService = createUserDataService(userId)
    
    try {
      const operation = await dataService.getAsyncOperation(operationId)
      
      if (!operation) {
        return NextResponse.json(
          { error: 'Operation not found' },
          { status: 404 }
        )
      }

      // Calculate time remaining if still processing
      let timeRemaining: number | undefined
      if (operation.status === 'processing' && operation.startedAt && operation.estimatedDuration) {
        const elapsed = Math.floor((Date.now() - operation.startedAt.getTime()) / 1000)
        timeRemaining = Math.max(0, operation.estimatedDuration - elapsed)
      }

      const isComplete = operation.status === 'completed' || operation.status === 'failed'

      return NextResponse.json({
        operation: {
          id: operation.id,
          operationType: operation.operationType,
          status: operation.status,
          progress: operation.progress,
          resultData: operation.resultData,
          errorMessage: operation.errorMessage,
          createdAt: operation.createdAt,
          startedAt: operation.startedAt,
          completedAt: operation.completedAt,
          estimatedDuration: operation.estimatedDuration
        },
        isComplete,
        timeRemaining
      })

    } finally {
      await dataService.disconnect()
    }

  } catch (error) {
    console.error('Error fetching async operation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch operation status' },
      { status: 500 }
    )
  }
}