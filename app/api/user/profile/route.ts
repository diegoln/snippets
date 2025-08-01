import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-utils'
import { createUserDataService } from '@/lib/user-scoped-data'
import { getToken } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user ID from session
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { jobTitle, seniorityLevel } = body

    // Validate input
    if (!jobTitle || !seniorityLevel) {
      return NextResponse.json(
        { error: 'Job title and seniority level are required' },
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
        const user = await prisma.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: token.email as string,
            name: token.name as string || null,
            image: token.picture as string || null,
            jobTitle,
            seniorityLevel,
          },
          update: {
            jobTitle,
            seniorityLevel,
          }
        })

        return NextResponse.json({
          id: user.id,
          jobTitle: user.jobTitle,
          seniorityLevel: user.seniorityLevel,
        })
      }
    }

    // Production path - use data service
    const dataService = createUserDataService(userId)
    try {
      const updatedUser = await dataService.updateUserProfile({
        jobTitle,
        seniorityLevel,
      })

      return NextResponse.json({
        id: updatedUser.id,
        jobTitle: updatedUser.jobTitle,
        seniorityLevel: updatedUser.seniorityLevel,
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
  try {
    // Get authenticated user ID from session
    const userId = await getUserIdFromRequest(request)
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
      
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        seniorityLevel: user.seniorityLevel,
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