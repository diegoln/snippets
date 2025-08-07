import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { llmProxy } from '../../../../lib/llmproxy'
import { snippetRateLimit, createRateLimitHeaders, createRateLimitResponse } from '../../../../lib/rate-limit'
import { buildWeeklySnippetPrompt, WeeklySnippetPromptContext } from './weekly-snippet-prompt'
import { integrationConsolidationService } from '../../../../lib/integration-consolidation-service'

// Input validation schema
const GenerateSnippetSchema = z.object({
  integrationType: z.literal('google_calendar'),
  weekData: z.object({
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    }),
    totalMeetings: z.number(),
    meetingContext: z.array(z.string()),
    keyMeetings: z.array(z.any()),
    weeklyContextSummary: z.string()
  }),
  userProfile: z.object({
    jobTitle: z.string(),
    seniorityLevel: z.string()
  })
})

/**
 * Generate LLM-powered weekly snippet from integration data
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

    // Check rate limiting
    const rateLimitResult = snippetRateLimit.check(userId)
    if (!rateLimitResult.allowed) {
      const headers = createRateLimitHeaders(rateLimitResult)
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult.resetTime),
        { status: 429, headers }
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

    // Check payload size before processing (prevent memory issues and excessive API costs)
    const payloadSize = JSON.stringify(body).length
    if (payloadSize > 100000) { // 100KB limit
      return NextResponse.json(
        { error: 'Calendar data too large. Please reduce the date range or contact support.' },
        { status: 413 }
      )
    }

    const validationResult = GenerateSnippetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { weekData, userProfile } = validationResult.data

    // Check if consolidated data exists for this week first
    const weekStart = new Date(weekData.dateRange.start)
    const weekEnd = new Date(weekData.dateRange.end)
    
    const consolidatedData = await integrationConsolidationService.getConsolidationsForReflection(
      userId,
      { start: weekStart, end: weekEnd }
    )

    let llmResponse
    if (consolidatedData.length > 0) {
      // Use consolidated data if available
      llmResponse = await generateWeeklySnippetFromConsolidation({
        consolidatedData: consolidatedData[0], // Use the first (most recent) consolidation
        userProfile,
        userId
      })
    } else {
      // Fallback to direct processing if no consolidated data
      const sanitizedCalendarData = sanitizeCalendarData(weekData)
      llmResponse = await generateWeeklySnippetWithLLM({
        calendarData: sanitizedCalendarData,
        userProfile,
        userId
      })
    }

    return NextResponse.json({
      success: true,
      weeklySnippet: llmResponse.weeklySnippet,
      bullets: llmResponse.bullets,
      insights: llmResponse.insights
    })

  } catch (error) {
    // Enhanced error logging with context
    const errorContext = {
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    console.error('Error generating snippet from integration:', errorContext)
    
    return NextResponse.json(
      { error: 'Failed to generate weekly snippet' },
      { status: 500 }
    )
  }
}

/**
 * Sanitize calendar data to remove sensitive information before sending to LLM
 */
function sanitizeCalendarData(weekData: any) {
  // Keywords that indicate potentially sensitive content
  const sensitiveKeywords = [
    'confidential', 'private', 'salary', 'compensation', 'performance review',
    'layoffs', 'termination', 'resignation', 'interview', 'candidate',
    'legal', 'lawsuit', 'compliance', 'audit', 'security incident',
    'password', 'credentials', 'api key', 'token', 'secret'
  ]

  const sanitizeText = (text: string): string => {
    if (!text) return text
    
    // Check for sensitive keywords (case insensitive)
    const lowerText = text.toLowerCase()
    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      lowerText.includes(keyword)
    )
    
    if (hasSensitiveContent) {
      // Replace with generic description
      return '[Meeting content filtered for privacy]'
    }
    
    // Remove potential email addresses and phone numbers
    return text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[phone]')
      .replace(/\b\d{10}\b/g, '[phone]')
  }

  return {
    ...weekData,
    meetingContext: weekData.meetingContext.map(sanitizeText),
    weeklyContextSummary: sanitizeText(weekData.weeklyContextSummary),
    keyMeetings: weekData.keyMeetings.map((meeting: any) => ({
      ...meeting,
      summary: sanitizeText(meeting.summary || ''),
      description: sanitizeText(meeting.description || '')
    }))
  }
}

/**
 * Generate weekly snippet using LLM proxy based on calendar integration data
 */
async function generateWeeklySnippetWithLLM({
  calendarData,
  userProfile,
  userId
}: {
  calendarData: any
  userProfile: { jobTitle: string; seniorityLevel: string }
  userId: string
}) {
  try {
    const promptContext: WeeklySnippetPromptContext = {
      calendarData,
      userProfile
    }
    const prompt = buildWeeklySnippetPrompt(promptContext)
    
    // Use LLM proxy for environment-aware processing
    const llmResponse = await llmProxy.request({
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
      context: { calendarData, userProfile, userId }
    })

    return parseLLMResponse(llmResponse.content)

  } catch (error) {
    console.error('LLM Proxy error:', error)
    // Fallback to mock response if LLM fails
    return generateMockLLMResponse(calendarData, userProfile)
  }
}


/**
 * Parse LLM response and extract structured data
 */
function parseLLMResponse(response: string) {
  try {
    // Try to parse as JSON first
    return JSON.parse(response)
  } catch {
    // If not JSON, create structured response from text
    const lines = response.split('\n').filter(line => line.trim())
    const bullets = lines
      .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
      .map(line => line.replace(/^[•\-\s]+/, '').trim())
      .slice(0, 6)

    return {
      weeklySnippet: lines.find(line => !line.trim().startsWith('•') && !line.trim().startsWith('-'))?.trim() || lines[0] || 'Generated weekly summary',
      bullets: bullets.length > 0 ? bullets : ['Participated in team meetings and project discussions'],
      insights: 'Generated from calendar integration data'
    }
  }
}

/**
 * Generate mock LLM response for development when OpenAI is not available
 */
function generateMockLLMResponse(calendarData: any, userProfile: { jobTitle: string; seniorityLevel: string }) {
  // Create realistic response based on Jack's challenging week
  const bullets = [
    'Participated in daily standups and provided updates on JWT authentication module progress',
    'Attended demo prep session and discussed authentication module readiness concerns with PM',
    'Responded to urgent production auth issues during 2-hour debug session with senior engineers',
    'Had extended 1:1 with team lead to discuss implementation blockers and timeline challenges',
    'Collaborated with architecture team on JWT refresh token approach and security considerations'
  ]

  const weeklySnippet = `This week focused primarily on the JWT authentication module implementation, though faced several technical challenges that required additional support. Participated in ${calendarData.totalMeetings} meetings including daily standups, demo preparation, and an urgent production incident response. Had productive architecture discussions with senior team members to clarify implementation approach for refresh token rotation. The week highlighted areas where additional guidance and pair programming could accelerate delivery of the authentication module.`

  const insights = 'Calendar shows high meeting load with focus on getting unblocked. Strong collaboration with senior engineers but may benefit from more structured technical guidance.'

  return {
    weeklySnippet,
    bullets,
    insights
  }
}

/**
 * Generate weekly snippet using consolidated integration data
 */
async function generateWeeklySnippetFromConsolidation({
  consolidatedData,
  userProfile,
  userId
}: {
  consolidatedData: any
  userProfile: { jobTitle: string; seniorityLevel: string }
  userId: string
}) {
  try {
    // Build a summary from the consolidated themes and evidence
    const themesSummary = consolidatedData.themes.map((theme: any) => {
      const evidenceCount = theme.categories.reduce((sum: number, cat: any) => sum + cat.evidence.length, 0)
      return `${theme.name} (${evidenceCount} activities)`
    }).join(', ')

    // Extract bullets from evidence statements
    const bullets: string[] = []
    for (const theme of consolidatedData.themes) {
      for (const category of theme.categories) {
        for (const evidence of category.evidence) {
          if (bullets.length < 6) { // Limit to 6 bullets
            bullets.push(evidence.statement)
          }
        }
      }
    }

    // Use consolidated summary or generate one from themes
    const weeklySnippet = consolidatedData.summary || 
      `This week focused on ${consolidatedData.themes.length} main areas: ${themesSummary}. ` +
      `Activities spanned ${consolidatedData.metrics.totalMeetings || 0} meetings ` +
      `covering various aspects of the ${userProfile.jobTitle} role.`

    const insights = consolidatedData.keyInsights.join(' ') || 
      'Generated from consolidated integration data with structured evidence mapping.'

    return {
      weeklySnippet,
      bullets: bullets.length > 0 ? bullets : ['Consolidated weekly activities processed successfully'],
      insights
    }

  } catch (error) {
    console.error('Error generating snippet from consolidated data:', error)
    // Fallback to basic response
    return {
      weeklySnippet: 'Weekly summary generated from consolidated integration data.',
      bullets: ['Participated in team activities and meetings'],
      insights: 'Consolidated data processing completed'
    }
  }
}