import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService } from '../../../../lib/user-scoped-data'
import { isDevLike } from '../../../../lib/environment'

// Force dynamic execution for environment detection
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID from session (with dev fallback for dev-like environments)
    let userId = await getUserIdFromRequest(request)
    if (!userId && isDevLike()) {
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
  // Only allow in dev-like environments (development + staging)
  if (!isDevLike()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development and staging environments' },
      { status: 403 }
    )
  }

  try {
    // Get authenticated user ID from session (with dev fallback for dev-like environments)
    let userId = await getUserIdFromRequest(request)
    if (!userId && isDevLike()) {
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