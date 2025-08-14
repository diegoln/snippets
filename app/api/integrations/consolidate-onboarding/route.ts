import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { integrationConsolidationService } from '../../../../lib/integration-consolidation-service'
import { GoogleCalendarService } from '../../../../lib/calendar-integration'
import { createUserDataService } from '../../../../lib/user-scoped-data'

// Input validation schema
const OnboardingConsolidationSchema = z.object({
  integrationType: z.literal('google_calendar')
})

/**
 * POST /api/integrations/consolidate-onboarding
 * 
 * Consolidate integration data for new users during onboarding.
 * This fetches the last week's data from the specified integration type
 * and processes it through the consolidation pipeline.
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validationResult = OnboardingConsolidationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { integrationType } = validationResult.data

    // Get user profile for consolidation context
    const dataService = createUserDataService(userId)
    let userProfile
    try {
      userProfile = await dataService.getUserProfile()
      if (!userProfile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }
    } finally {
      await dataService.disconnect()
    }

    // Calculate last week's date range using ISO week standards
    const now = new Date()
    const lastWeek = subWeeks(now, 1)
    const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 }) // Monday = 1
    const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 })

    // Fetch integration data based on type
    let rawIntegrationData
    if (integrationType === 'google_calendar') {
      // Use enhanced mock data (includes rich data for Jack) - in production this would fetch real calendar data
      rawIntegrationData = await GoogleCalendarService.generateMockData({
        weekStart,
        weekEnd,
        userId
      })
    } else {
      return NextResponse.json(
        { error: `Integration type ${integrationType} not supported` },
        { status: 400 }
      )
    }

    // Check if we have any calendar data
    if (!rawIntegrationData || 
        !rawIntegrationData.keyMeetings || 
        rawIntegrationData.keyMeetings.length === 0 ||
        rawIntegrationData.totalMeetings === 0) {
      // No calendar events found - return success but indicate no data
      return NextResponse.json({
        success: true,
        hasData: false,
        message: 'No calendar events found for the previous week',
        weekRange: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString()
        }
      })
    }

    // Get career guidelines for consolidation context
    const careerGuidelines = await getCareerGuidelinesForUser(userProfile)

    // Process through consolidation service
    const consolidationRequest = {
      userId,
      integrationType,
      weekStart,
      weekEnd,
      rawIntegrationData,
      userProfile: {
        name: userProfile.name || 'User',
        jobTitle: userProfile.jobTitle || 'Unknown',
        seniorityLevel: userProfile.seniorityLevel || 'Unknown'
      },
      careerGuidelines
    }

    // Consolidate the data - this MUST use LLM, no mock fallback
    const consolidatedData = await integrationConsolidationService.consolidateWeeklyData(consolidationRequest)
    
    // Store the consolidation
    const consolidationId = await integrationConsolidationService.storeConsolidation(
      userId,
      consolidationRequest,
      consolidatedData,
      'onboarding-consolidation', // prompt identifier
      process.env.GEMINI_MODEL || 'gemini-2.5-flash' // Use actual model from env
    )

    return NextResponse.json({
      success: true,
      hasData: true,
      consolidationId,
      message: 'Integration data consolidated successfully for onboarding',
      summary: {
        integrationType,
        weekRange: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString()
        },
        themes: consolidatedData.themes.length,
        totalEvidence: consolidatedData.themes.reduce((sum, theme) => 
          sum + theme.categories.reduce((catSum: number, cat: any) => catSum + cat.evidence.length, 0), 0
        )
      }
    })

  } catch (error) {
    // Enhanced error logging with context
    const errorContext = {
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    console.error('Error in onboarding consolidation:', errorContext)
    
    return NextResponse.json(
      { error: 'Failed to consolidate integration data for onboarding' },
      { status: 500 }
    )
  }
}

/**
 * Get career guidelines for user based on their role and level
 * This is a simplified version - in production this would use the CareerGuidelineTemplate model
 */
async function getCareerGuidelinesForUser(userProfile: any): Promise<string> {
  // Sanitize user input to prevent XSS
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/[<>\"'&]/g, '') // Remove potential XSS characters
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Allow only alphanumeric, spaces, hyphens, underscores
      .trim()
      .substring(0, 50) // Limit length
  }
  
  const safeJobTitle = sanitizeInput(userProfile.jobTitle || 'Unknown')
  const safeSeniorityLevel = sanitizeInput(userProfile.seniorityLevel || 'Unknown')
  
  // Mock career guidelines - in production this would query the CareerGuidelineTemplate table
  const mockGuidelines = `
## Career Guidelines for ${safeJobTitle} - ${safeSeniorityLevel} Level

### 🚀 Impact & Ownership
- Takes ownership of assigned tasks and delivers high-quality results
- Contributes to project planning and technical decision-making
- Demonstrates accountability for outcomes and learns from mistakes

### 💻 Craft & Expertise
- Shows strong technical skills in relevant technologies
- Writes clean, maintainable code following team standards
- Continuously learns and applies new technologies and best practices

### 💬 Communication & Collaboration
- Communicates effectively with team members and stakeholders
- Participates actively in team meetings and discussions
- Provides constructive feedback and supports team goals

### 🌱 Strategic Focus
- Understands business context and aligns work with company objectives
- Identifies opportunities for improvement and innovation
- Contributes to team processes and knowledge sharing
`

  return mockGuidelines.trim()
}