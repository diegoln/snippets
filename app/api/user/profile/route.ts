import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../lib/auth-utils'
import { createUserDataService } from '../../../lib/user-scoped-data'

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

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      // Update user profile
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