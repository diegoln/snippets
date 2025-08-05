import { NextRequest, NextResponse } from 'next/server'
import { jobService } from '../../../../lib/job-processor/job-service'

/**
 * POST /api/jobs/career-plan - Background job handler for career plan generation
 * 
 * This endpoint is called by the async job queue to process career plan generation.
 * It can be invoked by Cloud Tasks in production or directly in development.
 * 
 * Now uses the robust job processing system for consistent behavior across environments.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (in production this would be a service account token)
    const authHeader = request.headers.get('Authorization')
    const expectedToken = process.env.INTERNAL_API_KEY || 'dev-token'
    
    if (!authHeader || !authHeader.includes(expectedToken)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid service token' },
        { status: 401 }
      )
    }

    const { operationId, userId, inputData } = await request.json()
    
    if (!operationId || !userId || !inputData) {
      return NextResponse.json(
        { error: 'Missing required fields: operationId, userId, inputData' },
        { status: 400 }
      )
    }

    // Process the job using the unified job service
    const result = await jobService.processJob(
      'career_plan_generation',
      userId,
      operationId,
      inputData
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        operationId,
        result: result.data
      })
    } else {
      return NextResponse.json(
        { error: 'Career plan generation failed', details: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in career plan generation job:', error)
    return NextResponse.json(
      { error: 'Career plan generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

