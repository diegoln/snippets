/**
 * Manual Reflection Generation API
 * 
 * Allows users to trigger reflection generation on-demand
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createUserDataService } from '../../../../lib/user-scoped-data'
import { jobService } from '../../../../lib/job-processor/job-service'
import { AsyncOperationType, AsyncOperationStatus } from '../../../../types/async-operations'
import { startOfWeek, endOfWeek, getISOWeek } from 'date-fns'
// Note: Using development fallback for auth since NextAuth config is not exported

// Request validation schema
const generateReflectionSchema = z.object({
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
  includeIntegrations: z.array(z.string()).optional(),
  includePreviousContext: z.boolean().optional(),
  triggerType: z.literal('manual').optional()
})

type GenerateReflectionRequest = z.infer<typeof generateReflectionSchema>

/**
 * POST /api/reflections/generate
 * Start manual reflection generation
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID (using development fallback for now)
    const devUserId = request.headers.get('X-Dev-User-Id')
    const finalUserId = devUserId

    if (!finalUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = generateReflectionSchema.parse(body)

    // Determine week range
    const now = new Date()
    const weekStart = validatedData.weekStart 
      ? new Date(validatedData.weekStart)
      : startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = validatedData.weekEnd
      ? new Date(validatedData.weekEnd)
      : endOfWeek(now, { weekStartsOn: 1 })

    const dataService = createUserDataService(finalUserId)

    try {
      // Check if already processing
      const existingOps = await dataService.getAsyncOperations({
        operationType: AsyncOperationType.WEEKLY_REFLECTION,
        status: AsyncOperationStatus.PROCESSING,
        limit: 5
      })

      const inProgress = existingOps.find(op => 
        op.status === AsyncOperationStatus.PROCESSING ||
        op.status === AsyncOperationStatus.QUEUED
      )

      if (inProgress) {
        return NextResponse.json({
          success: false,
          error: 'A reflection is already being generated. Please wait for it to complete.',
          operationId: inProgress.id
        }, { status: 409 })
      }

      // Check if reflection already exists for this week
      const currentWeek = getISOWeek(weekStart)
      const currentYear = weekStart.getFullYear()
      
      const existingSnippets = await dataService.getSnippetsInDateRange(weekStart, weekEnd)
      const hasExistingReflection = existingSnippets.some(snippet => 
        snippet.weekNumber === currentWeek && 
        new Date(snippet.startDate).getFullYear() === currentYear
      )

      if (hasExistingReflection) {
        return NextResponse.json({
          success: false,
          error: `A reflection already exists for week ${currentWeek}, ${currentYear}. Edit the existing reflection instead.`,
          weekNumber: currentWeek,
          year: currentYear
        }, { status: 409 })
      }

      // Get user's reflection preferences for integration settings
      const userProfile = await dataService.getUserProfile()
      const includeIntegrations = validatedData.includeIntegrations || 
        (Array.isArray(userProfile?.reflectionIncludeIntegrations) 
          ? userProfile.reflectionIncludeIntegrations as string[]
          : [])

      // Create async operation
      const operation = await dataService.createAsyncOperation({
        operationType: AsyncOperationType.WEEKLY_REFLECTION,
        status: AsyncOperationStatus.QUEUED,
        inputData: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          includeIntegrations,
          includePreviousContext: validatedData.includePreviousContext ?? true,
          automated: false
        },
        metadata: {
          triggerType: 'manual',
          requestedAt: now.toISOString(),
          weekNumber: currentWeek,
          year: currentYear
        }
      })

      // Process the job
      await jobService.processJob(
        'weekly_reflection_generation',
        finalUserId,
        operation.id,
        {
          userId: finalUserId,
          weekStart,
          weekEnd,
          includeIntegrations,
          includePreviousContext: validatedData.includePreviousContext ?? true
        }
      )

      return NextResponse.json({
        success: true,
        operationId: operation.id,
        weekNumber: currentWeek,
        year: currentYear,
        estimatedDuration: operation.estimatedDuration || 120000, // 2 minutes default
        message: 'Reflection generation started successfully'
      })

    } finally {
      await dataService.disconnect()
    }

  } catch (error) {
    console.error('Error starting reflection generation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start reflection generation'
      },
      { status: 500 }
    )
  }
}