import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService } from '../../../../lib/user-scoped-data'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID from session (with dev fallback)
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

    const body = await request.json()
    const { completed } = body

    if (completed !== true) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Mark onboarding as completed with timestamp
    const dataService = createUserDataService(userId)
    try {
      await dataService.updateUserProfile({
        onboardingCompletedAt: new Date()
      })

      return NextResponse.json({ 
        success: true, 
        completed: true,
        completedAt: new Date().toISOString()
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error marking onboarding complete:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    // Get authenticated user ID from session (with dev fallback)
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

    // Reset onboarding status by clearing the completion timestamp
    const dataService = createUserDataService(userId)
    try {
      await dataService.updateUserProfile({
        onboardingCompletedAt: null
      })

      console.log(`🔄 DevTools: Reset onboarding for user ${userId}`)

      return NextResponse.json({ 
        success: true, 
        message: 'Onboarding status reset successfully',
        resetAt: new Date().toISOString()
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error resetting onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to reset onboarding status' },
      { status: 500 }
    )
  }
}