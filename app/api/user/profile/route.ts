import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService } from '../../../../lib/user-scoped-data'
import { getToken } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  let userId: string | null = null
  
  try {
    // Get authenticated user ID from session (with dev fallback)
    userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { jobTitle, seniorityLevel, performanceFeedback } = body

    // Handle different update scenarios
    const hasRoleUpdate = jobTitle || seniorityLevel
    const hasPerformanceUpdate = performanceFeedback !== undefined
    
    // Validate input - either role update or performance update
    if (!hasRoleUpdate && !hasPerformanceUpdate) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      )
    }
    
    // For role updates, both fields are required
    if (hasRoleUpdate && (!jobTitle || !seniorityLevel)) {
      return NextResponse.json(
        { error: 'Job title and seniority level are both required for role updates' },
        { status: 400 }
      )
    }

    // Note: We don't validate against enums anymore since we allow custom values
    // The frontend sends the actual custom value when "other" is selected

    // In development with mock auth, ensure user exists
    if (process.env.NODE_ENV === 'development') {
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'development'
      })
      
      if (token?.email) {
        // Create or update user directly
        const updateData: any = {}
        if (hasRoleUpdate) {
          updateData.jobTitle = jobTitle
          updateData.seniorityLevel = seniorityLevel
        }
        if (hasPerformanceUpdate) {
          updateData.performanceFeedback = performanceFeedback
        }
        
        const user = await prisma.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: token.email as string,
            name: token.name as string || null,
            image: token.picture as string || null,
            ...updateData
          },
          update: updateData
        })

        return NextResponse.json({
          id: user.id,
          jobTitle: user.jobTitle,
          seniorityLevel: user.seniorityLevel,
          performanceFeedback: user.performanceFeedback,
        })
      }
    }

    // Production path - use data service
    const dataService = createUserDataService(userId)
    try {
      const updateParams: any = {}
      if (hasRoleUpdate) {
        updateParams.jobTitle = jobTitle
        updateParams.seniorityLevel = seniorityLevel
      }
      if (hasPerformanceUpdate) {
        updateParams.performanceFeedback = performanceFeedback
      }
      
      const updatedUser = await dataService.updateUserProfile(updateParams)

      if (!updatedUser) {
        throw new Error('Failed to update user profile')
      }

      return NextResponse.json({
        id: updatedUser.id,
        jobTitle: updatedUser.jobTitle,
        seniorityLevel: updatedUser.seniorityLevel,
        performanceFeedback: updatedUser.performanceFeedback,
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error updating user profile:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      operation: 'PUT /api/user/profile',
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  let userId: string | null = null
  
  try {
    // Get authenticated user ID from session (with dev fallback)
    userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile data
    const dataService = createUserDataService(userId)
    try {
      const user = await dataService.getUserProfile()
      
      if (!user) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        seniorityLevel: user.seniorityLevel,
        performanceFeedback: user.performanceFeedback,
        onboardingCompleted: !!user.onboardingCompletedAt,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() || null,
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error fetching user profile:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      operation: 'GET /api/user/profile',
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}