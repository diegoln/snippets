import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-utils'
import { createUserDataService } from '@/lib/user-scoped-data'

export async function POST(request: NextRequest) {
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