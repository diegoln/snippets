import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-utils'
import { createUserDataService } from '@/lib/user-scoped-data'
import { getToken } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'
import { isValidRole, isValidLevel } from '@/constants/user'

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

    // Validate role and level enums
    if (!isValidRole(jobTitle)) {
      return NextResponse.json(
        { error: 'Invalid job title. Must be one of: engineer, designer, product, data' },
        { status: 400 }
      )
    }

    if (!isValidLevel(seniorityLevel)) {
      return NextResponse.json(
        { error: 'Invalid seniority level. Must be one of: junior, mid, senior, staff, principal' },
        { status: 400 }
      )
    }

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
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}