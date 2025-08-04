import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth-utils'
import { createUserDataService } from '@/lib/user-scoped-data'
import { isWeekInFuture, isValidWeekNumber } from '@/lib/week-utils'
import { getToken } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'

/**
 * GET /api/snippets - Fetch all weekly snippets for the authenticated user
 * 
 * Uses session-based authentication to ensure users only see their own data.
 * Returns snippets ordered by start date (most recent first).
 */
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

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      // Get snippets for the authenticated user
      const snippets = await dataService.getSnippets()

      // Convert dates to ISO strings for JSON serialization
      const serializedSnippets = snippets.map((snippet: any) => ({
        id: snippet.id,
        weekNumber: snippet.weekNumber,
        year: snippet.year,
        startDate: snippet.startDate.toISOString().split('T')[0],
        endDate: snippet.endDate.toISOString().split('T')[0],
        content: snippet.content,
        extractedTasks: snippet.extractedTasks,
        extractedMeetings: snippet.extractedMeetings,
        aiSuggestions: snippet.aiSuggestions,
        createdAt: snippet.createdAt.toISOString(),
        updatedAt: snippet.updatedAt.toISOString()
      }))

      return NextResponse.json(serializedSnippets)
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error fetching snippets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snippets' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/snippets - Create a new weekly snippet for the authenticated user
 */
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
    const { weekNumber, content, year } = body

    // Validate required fields
    if (!weekNumber || !content) {
      return NextResponse.json(
        { error: 'weekNumber and content are required' },
        { status: 400 }
      )
    }

    // Validate weekNumber is a valid integer
    if (!isValidWeekNumber(weekNumber)) {
      return NextResponse.json(
        { error: 'weekNumber must be a valid week number (1-53)' },
        { status: 400 }
      )
    }

    // Calculate start and end dates for the week
    const currentYear = year || new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const daysToAdd = (weekNumber - 1) * 7
    const startDate = new Date(startOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000) // +4 days for Friday

    // Prevent creation of future snippets
    if (isWeekInFuture(weekNumber, currentYear)) {
      return NextResponse.json(
        { error: 'Cannot create snippets for future weeks' },
        { status: 400 }
      )
    }

    // In development, ensure user exists before creating snippet
    if (process.env.NODE_ENV === 'development') {
      const prisma = new PrismaClient()
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'development'
      })
      
      if (token?.email) {
        // Ensure user exists
        await prisma.user.upsert({
          where: { id: userId },
          create: {
            id: userId,
            email: token.email as string,
            name: token.name as string || null,
            image: token.picture as string || null,
          },
          update: {}
        })
      }
    }

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      const newSnippet = await dataService.createSnippet({
        weekNumber,
        year: currentYear,
        startDate,
        endDate,
        content
      })

      return NextResponse.json({
        id: newSnippet.id,
        weekNumber: newSnippet.weekNumber,
        year: newSnippet.year,
        startDate: newSnippet.startDate.toISOString().split('T')[0],
        endDate: newSnippet.endDate.toISOString().split('T')[0],
        content: newSnippet.content,
        createdAt: newSnippet.createdAt.toISOString(),
        updatedAt: newSnippet.updatedAt.toISOString()
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error creating snippet:', error)
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Failed to create snippet'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/snippets - Update an existing snippet for the authenticated user
 */
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
    const { id, content } = body

    if (!id || !content) {
      return NextResponse.json(
        { error: 'id and content are required' },
        { status: 400 }
      )
    }

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      const updatedSnippet = await dataService.updateSnippet(id, content)

      return NextResponse.json({
        id: updatedSnippet.id,
        weekNumber: updatedSnippet.weekNumber,
        year: updatedSnippet.year,
        startDate: updatedSnippet.startDate.toISOString().split('T')[0],
        endDate: updatedSnippet.endDate.toISOString().split('T')[0],
        content: updatedSnippet.content,
        updatedAt: updatedSnippet.updatedAt.toISOString()
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error updating snippet:', error)
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(
        { error: 'Snippet not found or access denied' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update snippet' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/snippets - Delete a specific weekly snippet
 * 
 * Requires snippet ID in request body and ensures user can only delete their own snippets.
 */
export async function DELETE(request: NextRequest) {
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
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      await dataService.deleteSnippet(id)

      return NextResponse.json({
        success: true,
        message: 'Snippet deleted successfully'
      })
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error deleting snippet:', error)
    
    // Handle specific error cases
    if (error instanceof Error && error.message.includes('access denied')) {
      return NextResponse.json(
        { error: 'Snippet not found or access denied' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete snippet' },
      { status: 500 }
    )
  }
}