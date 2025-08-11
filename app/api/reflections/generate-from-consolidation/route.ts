import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { llmProxy } from '../../../../lib/llmproxy'
import { reflectionRateLimit, createRateLimitHeaders, createRateLimitResponse } from '../../../../lib/rate-limit'
import { integrationConsolidationService } from '../../../../lib/integration-consolidation-service'
import { createUserDataService } from '../../../../lib/user-scoped-data'

// Input validation schema
const GenerateReflectionSchema = z.object({
  consolidationId: z.string().optional(),
  weekRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
})

/**
 * Generate reflection directly from consolidated integration data
 * 
 * This endpoint creates reflections using the consolidated themes and evidence
 * from integration data, ensuring the actual meeting/calendar context is used.
 * 
 * NO MOCK DATA should be generated here - only real LLM processing.
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
    const rateLimitResult = reflectionRateLimit.check(userId)
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

    const validationResult = GenerateReflectionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { consolidationId, weekRange } = validationResult.data

    // Get user profile
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

    // Get consolidated data
    let consolidation
    if (consolidationId) {
      // Fetch specific consolidation
      consolidation = await integrationConsolidationService.getConsolidationById(consolidationId, userId)
    } else if (weekRange) {
      // Fetch consolidations for date range
      const consolidations = await integrationConsolidationService.getConsolidationsForReflection(
        userId,
        { start: new Date(weekRange.start), end: new Date(weekRange.end) }
      )
      consolidation = consolidations[0] // Use most recent
    } else {
      // Get latest consolidation
      consolidation = await integrationConsolidationService.getLatestConsolidation(userId)
    }

    if (!consolidation) {
      return NextResponse.json(
        { 
          error: 'No consolidated data available',
          message: 'Please connect your calendar first to generate reflections'
        },
        { status: 404 }
      )
    }

    // Check if consolidation has data
    if (!consolidation.themes || consolidation.themes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          hasData: false,
          message: 'No activities found in the consolidated data. Please write your reflection manually.'
        },
        { status: 200 }
      )
    }

    // Generate reflection using LLM with consolidated data
    const reflection = await generateReflectionFromConsolidation({
      consolidation,
      userProfile: {
        name: userProfile.name || 'User',
        jobTitle: userProfile.jobTitle || 'Unknown',
        seniorityLevel: userProfile.seniorityLevel || 'Unknown'
      }
    })

    const consolidationWithId = consolidation as any // Type includes id, weekStart, weekEnd
    return NextResponse.json({
      success: true,
      hasData: true,
      reflection: reflection.content,
      insights: reflection.insights,
      consolidationId: consolidationWithId.id,
      weekRange: {
        start: consolidationWithId.weekStart,
        end: consolidationWithId.weekEnd
      }
    })

  } catch (error) {
    const errorContext = {
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    console.error('Error generating reflection from consolidation:', errorContext)
    
    // DO NOT return mock data on error - fail explicitly
    return NextResponse.json(
      { error: 'Failed to generate reflection from consolidated data' },
      { status: 500 }
    )
  }
}

/**
 * Generate reflection using consolidated integration data
 * 
 * CRITICAL: This function MUST use the LLM proxy - no mock fallbacks allowed
 */
async function generateReflectionFromConsolidation({
  consolidation,
  userProfile
}: {
  consolidation: any
  userProfile: { name: string; jobTitle: string; seniorityLevel: string }
}) {
  // Build prompt from consolidated themes and evidence
  const prompt = buildReflectionPromptFromConsolidation(consolidation, userProfile)
  
  // Use LLM proxy - no fallbacks
  const llmResponse = await llmProxy.request({
    prompt,
    temperature: 0.7,
    maxTokens: 1000,
    context: { 
      type: 'reflection_from_consolidation',
      consolidationId: consolidation.id,
      userId: consolidation.userId
    }
  })

  return parseReflectionResponse(llmResponse.content)
}

/**
 * Build reflection prompt using consolidated themes and evidence
 */
function buildReflectionPromptFromConsolidation(consolidation: any, userProfile: any): string {
  // Extract themes and evidence
  const themes = consolidation.themes || []
  const keyInsights = consolidation.keyInsights || []
  const metrics = consolidation.metrics || {}
  
  // Build evidence statements grouped by theme
  let evidenceByTheme = ''
  for (const theme of themes) {
    evidenceByTheme += `\n### ${theme.name}\n`
    for (const category of theme.categories || []) {
      evidenceByTheme += `**${category.name}:**\n`
      for (const evidence of category.evidence || []) {
        evidenceByTheme += `- ${evidence.statement}\n`
      }
    }
  }

  return `
Transform the following consolidated weekly activities into a structured reflection for a ${userProfile.seniorityLevel} ${userProfile.jobTitle}.

CONSOLIDATED WEEKLY DATA:
${consolidation.summary || 'Week summary not available'}

KEY THEMES AND EVIDENCE:
${evidenceByTheme}

KEY INSIGHTS:
${keyInsights.join('\n')}

METRICS:
- Total Meetings: ${metrics.totalMeetings || 0}
- Meeting Hours: ${metrics.meetingHours || 0}
- Key Stakeholders: ${metrics.keyStakeholders || 0}

REQUIREMENTS:
1. Create a structured reflection in the format: ## Done, ## Next, ## Notes
2. Under "Done" - Extract 3-5 specific accomplishments from the evidence provided
3. Under "Next" - Identify 2-3 concrete next steps based on the themes and insights
4. Under "Notes" - Include observations about challenges, learnings, or patterns
5. Write in first person, using action verbs
6. Base ALL content on the actual evidence provided - do not invent activities
7. Reflect the appropriate scope for a ${userProfile.seniorityLevel} level ${userProfile.jobTitle}
8. Be honest about challenges while maintaining a constructive tone

FORMAT:
Return as plain markdown text in this exact format:

## Done

- [specific accomplishment from evidence]
- [specific accomplishment from evidence]
...

## Next

- [concrete next step based on themes]
- [concrete next step based on themes]
...

## Notes

[Observations about patterns, challenges, or learnings from the evidence]
`
}

/**
 * Parse LLM response for reflection
 */
function parseReflectionResponse(response: string) {
  try {
    // If LLM returns JSON, extract content
    const parsed = JSON.parse(response)
    return {
      content: parsed.reflection || parsed.content || response,
      insights: parsed.insights || 'Generated from consolidated integration data'
    }
  } catch {
    // If not JSON, treat as markdown
    return {
      content: response.trim(),
      insights: 'Reflection generated from consolidated weekly activities'
    }
  }
}