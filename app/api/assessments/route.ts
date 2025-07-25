import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { SnippetSelector } from '../../../lib/snippet-selector'
import { PromptProcessor } from '../../../lib/prompt-processor'
import { llmProxy } from '../../../lib/llmproxy'
import { AssessmentContext } from '../../../types/performance'

/**
 * Prisma client singleton with lazy initialization
 * 
 * This pattern prevents database connection attempts during build time,
 * which would cause Docker builds to fail. The client is only created
 * when DATABASE_URL is available (runtime) and when first accessed.
 * 
 * @see app/api/snippets/route.ts for detailed explanation
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
 * POST /api/assessments - Generate a new performance assessment
 */
export async function POST(request: NextRequest) {
  const snippetSelector = new SnippetSelector()
  
  try {
    const client = getPrismaClient()
    if (!client) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }
    const body = await request.json()
    const { 
      cycleName, 
      startDate, 
      endDate, 
      assessmentDirections,
      userEmail = 'test@example.com' // Default to test user for development
    } = body

    // Validate required fields
    if (!cycleName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'cycleName, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start >= end) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      )
    }

    console.log(`🔍 Generating assessment for ${cycleName} (${startDate} to ${endDate})`)

    // Get user profile
    const userProfile = await snippetSelector.getUserByEmail(userEmail)
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found. Make sure test data is seeded.' },
        { status: 404 }
      )
    }

    // Get snippets within the timeframe
    const allSnippets = await snippetSelector.getSnippetsInTimeframe(
      userProfile.id, 
      startDate, 
      endDate
    )

    // Filter for meaningful content
    const meaningfulSnippets = snippetSelector.filterMeaningfulSnippets(allSnippets)
    
    if (meaningfulSnippets.length === 0) {
      return NextResponse.json(
        { 
          error: 'No work snippets found for the specified date range',
          suggestion: 'Try adjusting the date range or ensure snippets exist for this period'
        },
        { status: 404 }
      )
    }

    // Get assessment stats
    const stats = snippetSelector.getAssessmentStats(meaningfulSnippets)
    console.log(`📊 Found ${stats.totalWeeks} weeks of snippets (${stats.dateRange.start} to ${stats.dateRange.end})`)

    // Build assessment context
    const assessmentContext: AssessmentContext = {
      userProfile: {
        jobTitle: userProfile.jobTitle || 'Software Engineer',
        seniorityLevel: userProfile.seniorityLevel || 'Senior'
      },
      cyclePeriod: {
        cycleName,
        startDate,
        endDate
      },
      weeklySnippets: meaningfulSnippets.map(snippet => ({
        weekNumber: snippet.weekNumber,
        startDate: snippet.startDate,
        endDate: snippet.endDate,
        content: snippet.content
      })),
      previousFeedback: userProfile.performanceFeedback || undefined,
      assessmentDirections: assessmentDirections || undefined,
      snippetCount: meaningfulSnippets.length
    }

    // Generate prompt from template
    console.log('📝 Processing prompt template...')
    const prompt = await PromptProcessor.processPerformanceAssessmentPrompt(assessmentContext)
    
    // Generate assessment using LLM
    console.log('🤖 Generating assessment with LLM...')
    const llmResponse = await llmProxy.generatePerformanceAssessment(assessmentContext)
    
    // Create assessment record in database
    const assessment = await client.performanceAssessment.create({
      data: {
        userId: userProfile.id,
        cycleName,
        startDate: start,
        endDate: end,
        generatedDraft: llmResponse.content
      }
    })

    console.log(`✅ Assessment generated successfully (${llmResponse.usage?.tokens || 0} tokens)`)

    return NextResponse.json({
      id: assessment.id,
      cycleName: assessment.cycleName,
      startDate: assessment.startDate.toISOString().split('T')[0],
      endDate: assessment.endDate.toISOString().split('T')[0],
      generatedDraft: assessment.generatedDraft,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      isGenerating: false,
      stats: {
        snippetsUsed: meaningfulSnippets.length,
        dateRange: stats.dateRange,
        tokensGenerated: llmResponse.usage?.tokens || 0,
        model: llmResponse.model,
        cost: llmResponse.usage?.cost || 0
      }
    })

  } catch (error) {
    console.error('Error generating assessment:', error)
    
    // Provide helpful error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('template')) {
        return NextResponse.json(
          { error: 'Failed to process assessment template', details: error.message },
          { status: 500 }
        )
      }
      if (error.message.includes('LLM')) {
        return NextResponse.json(
          { error: 'Failed to generate assessment with AI', details: error.message },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate performance assessment' },
      { status: 500 }
    )
  } finally {
    await snippetSelector.disconnect()
    const client = getPrismaClient()
    if (client) {
      await client.$disconnect()
    }
  }
}

/**
 * GET /api/assessments - Get all performance assessments for a user
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

    // For development, get assessments for test user
    const testUser = await client.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!testUser) {
      return NextResponse.json([])
    }

    const assessments = await client.performanceAssessment.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        cycleName: true,
        startDate: true,
        endDate: true,
        generatedDraft: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Format dates for JSON serialization
    const formattedAssessments = assessments.map(assessment => ({
      ...assessment,
      startDate: assessment.startDate.toISOString().split('T')[0],
      endDate: assessment.endDate.toISOString().split('T')[0],
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
      isGenerating: false
    }))

    return NextResponse.json(formattedAssessments)
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    )
  } finally {
    const client = getPrismaClient()
    if (client) {
      await client.$disconnect()
    }
  }
}