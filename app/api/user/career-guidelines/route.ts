import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService } from '../../../../lib/user-scoped-data'

// Input validation schema
const CareerGuidelinesSchema = z.object({
  currentLevelPlan: z.string().min(1, 'Current level plan is required').max(2000, 'Plan too long'),
  nextLevelExpectations: z.string().min(1, 'Next level expectations is required').max(2000, 'Expectations too long'),
  companyCareerLadder: z.string().max(1000, 'Career ladder description too long').optional()
})

/**
 * PUT /api/user/career-guidelines - Update user's career guidelines
 */
export async function PUT(request: NextRequest) {
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

    // Validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validationResult = CareerGuidelinesSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { currentLevelPlan, nextLevelExpectations, companyCareerLadder } = validationResult.data
    const dataService = createUserDataService(userId)

    try {
      // Update user's career guidelines
      await dataService.updateUserProfile({
        careerProgressionPlan: currentLevelPlan,
        nextLevelExpectations: nextLevelExpectations,
        companyCareerLadder: companyCareerLadder || undefined,
        careerPlanGeneratedAt: new Date(),
        careerPlanLastUpdated: new Date()
      })

      // Get updated user data
      const updatedUser = await dataService.getUserProfile()
      
      return NextResponse.json({
        success: true,
        careerGuidelines: {
          currentLevelPlan: updatedUser?.careerProgressionPlan || null,
          nextLevelExpectations: updatedUser?.nextLevelExpectations || null,
          companyCareerLadder: updatedUser?.companyCareerLadder || null
        }
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error updating career guidelines:', error)
    return NextResponse.json(
      { error: 'Failed to update career guidelines' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/career-guidelines - Get user's career guidelines
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

    const dataService = createUserDataService(userId)

    try {
      const user = await dataService.getUserProfile()
      
      return NextResponse.json({
        careerGuidelines: {
          currentLevelPlan: user?.careerProgressionPlan || null,
          nextLevelExpectations: user?.nextLevelExpectations || null,
          companyCareerLadder: user?.companyCareerLadder || null
        }
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error fetching career guidelines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch career guidelines' },
      { status: 500 }
    )
  }
}