import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    // In a real implementation, we would add an 'onboardingCompleted' field to the User model
    // For now, we'll just return success
    // The presence of jobTitle and seniorityLevel can indicate onboarding completion
    
    return NextResponse.json({ success: true, completed: true })
  } catch (error) {
    console.error('Error marking onboarding complete:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding status' },
      { status: 500 }
    )
  }
}