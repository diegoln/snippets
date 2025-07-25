import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton with lazy initialization
 * 
 * This pattern prevents database connection attempts during build time,
 * which would cause Docker builds to fail. The client is only created
 * when DATABASE_URL is available (runtime) and when first accessed.
 * 
 * In production, DATABASE_URL comes from Google Secret Manager and
 * uses Cloud SQL Unix socket connection format:
 * postgresql://user:pass@localhost/db?host=/cloudsql/PROJECT:REGION:INSTANCE
 */
let prisma: PrismaClient | null = null

/**
 * Get or create the Prisma client instance
 * 
 * @returns PrismaClient instance or null if DATABASE_URL is not available
 */
function getPrismaClient(): PrismaClient | null {
  if (!prisma && process.env.DATABASE_URL) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }
  return prisma
}

/**
 * GET /api/snippets - Fetch all weekly snippets for a user
 * Returns snippets ordered by week number (ascending)
 */
export async function GET(request: NextRequest) {
  try {
    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }

    // For now, get snippets for the test user
    // In production, this would be based on authenticated user session
    const testUser = await client.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!testUser) {
      return NextResponse.json(
        { error: 'Test user not found. Run npm run setup:dev to initialize.' },
        { status: 404 }
      )
    }

    const snippets = await client.weeklySnippet.findMany({
      where: { userId: testUser.id },
      orderBy: { startDate: 'desc' }, // Most recent first
      select: {
        id: true,
        weekNumber: true,
        startDate: true,
        endDate: true,
        content: true
      }
    })

    // Convert dates to ISO strings for JSON serialization
    const serializedSnippets = snippets.map(snippet => ({
      ...snippet,
      startDate: snippet.startDate.toISOString().split('T')[0], // YYYY-MM-DD format
      endDate: snippet.endDate.toISOString().split('T')[0]
    }))

    return NextResponse.json(serializedSnippets)
  } catch (error) {
    console.error('Error fetching snippets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snippets' },
      { status: 500 }
    )
  } finally {
    const client = getPrismaClient()
    if (client) {
      await client.$disconnect()
    }
  }
}

/**
 * POST /api/snippets - Create a new weekly snippet
 */
export async function POST(request: NextRequest) {
  try {
    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { weekNumber, content } = body

    // Validate required fields
    if (!weekNumber || !content) {
      return NextResponse.json(
        { error: 'weekNumber and content are required' },
        { status: 400 }
      )
    }

    // For now, create for test user
    const testUser = await client.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!testUser) {
      return NextResponse.json(
        { error: 'Test user not found' },
        { status: 404 }
      )
    }

    // Calculate start and end dates for the week
    const currentYear = new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const daysToAdd = (weekNumber - 1) * 7
    const startDate = new Date(startOfYear.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    const endDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000) // +4 days for Friday

    const newSnippet = await client.weeklySnippet.create({
      data: {
        userId: testUser.id,
        weekNumber,
        startDate,
        endDate,
        content
      }
    })

    return NextResponse.json({
      ...newSnippet,
      startDate: newSnippet.startDate.toISOString().split('T')[0],
      endDate: newSnippet.endDate.toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Error creating snippet:', error)
    return NextResponse.json(
      { error: 'Failed to create snippet' },
      { status: 500 }
    )
  } finally {
    const client = getPrismaClient()
    if (client) {
      await client.$disconnect()
    }
  }
}

/**
 * PUT /api/snippets - Update an existing snippet
 */
export async function PUT(request: NextRequest) {
  try {
    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
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

    const updatedSnippet = await client.weeklySnippet.update({
      where: { id },
      data: { content }
    })

    return NextResponse.json({
      ...updatedSnippet,
      startDate: updatedSnippet.startDate.toISOString().split('T')[0],
      endDate: updatedSnippet.endDate.toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Error updating snippet:', error)
    return NextResponse.json(
      { error: 'Failed to update snippet' },
      { status: 500 }
    )
  } finally {
    const client = getPrismaClient()
    if (client) {
      await client.$disconnect()
    }
  }
}