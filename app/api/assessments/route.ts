import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../lib/dev-auth'
import { createUserDataService } from '../../../lib/user-scoped-data'
import { llmProxy } from '../../../lib/llmproxy'
import { AssessmentContext } from '../../../types/performance'
import { buildPerformanceAssessmentPrompt } from './performance-assessment-prompt'

/**
 * POST /api/assessments - Generate a new performance assessment for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID from session
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
    const { 
      cycleName, 
      startDate, 
      endDate, 
      checkInFocusAreas
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

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      // Get user profile
      const userProfile = await dataService.getUserProfile()
      if (!userProfile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      // Get snippets within the timeframe
      const allSnippets = await dataService.getSnippetsInDateRange(start, end)

      // Filter for meaningful content (simple filtering logic)
      const meaningfulSnippets = allSnippets.filter((snippet: any) => {
        const content = snippet.content.trim()
        return content && content.length >= 20 && !content.toLowerCase().includes('placeholder')
      })
      
      if (meaningfulSnippets.length === 0) {
        return NextResponse.json(
          { 
            error: 'No work snippets found for the specified date range',
            suggestion: 'Try adjusting the date range or ensure snippets exist for this period'
          },
          { status: 404 }
        )
      }

      console.log(`📊 Found ${meaningfulSnippets.length} meaningful snippets`)

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
        weeklySnippets: meaningfulSnippets.map((snippet: any) => ({
          weekNumber: snippet.weekNumber,
          startDate: snippet.startDate.toISOString().split('T')[0],
          endDate: snippet.endDate.toISOString().split('T')[0],
          content: snippet.content
        })),
        previousFeedback: userProfile.performanceFeedback || undefined,
        checkInFocusAreas: checkInFocusAreas || undefined,
        snippetCount: meaningfulSnippets.length
      }

      // Generate assessment using LLM
      console.log('🤖 Generating assessment with LLM...')
      const prompt = buildPerformanceAssessmentPrompt(assessmentContext)
      const llmResponse = await llmProxy.request({
        prompt,
        temperature: 0.7,
        maxTokens: 2000,
        context: assessmentContext
      })
      
      // Create assessment record
      const assessment = await dataService.createAssessment({
        cycleName,
        startDate: start,
        endDate: end,
        generatedDraft: llmResponse.content
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
          tokensGenerated: llmResponse.usage?.tokens || 0,
          model: llmResponse.model,
          cost: llmResponse.usage?.cost || 0
        }
      })
    } finally {
      await dataService.disconnect()
    }

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
  }
}

/**
 * GET /api/assessments - Get all performance assessments for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID from session
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

    // Create user-scoped data service
    const dataService = createUserDataService(userId)

    try {
      const assessments = await dataService.getAssessments()

      // Format dates for JSON serialization
      const formattedAssessments = assessments.map((assessment: any) => ({
        id: assessment.id,
        cycleName: assessment.cycleName,
        startDate: assessment.startDate.toISOString().split('T')[0],
        endDate: assessment.endDate.toISOString().split('T')[0],
        generatedDraft: assessment.generatedDraft,
        createdAt: assessment.createdAt.toISOString(),
        updatedAt: assessment.updatedAt.toISOString(),
        isGenerating: false
      }))

      return NextResponse.json(formattedAssessments)
    } finally {
      await dataService.disconnect()
    }
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    )
  }
}