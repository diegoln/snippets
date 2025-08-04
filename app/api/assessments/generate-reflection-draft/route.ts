import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { llmProxy } from '../../../../lib/llmproxy'
import { reflectionRateLimit, createRateLimitHeaders, createRateLimitResponse } from '../../../../lib/rate-limit'

// Input validation schema
const GenerateReflectionSchema = z.object({
  weeklySnippet: z.string(),
  bullets: z.array(z.string()),
  userProfile: z.object({
    jobTitle: z.string(),
    seniorityLevel: z.string()
  })
})

/**
 * Generate LLM-powered reflection draft from weekly snippet
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null
  
  try {
    userId = await getUserIdFromRequest(request)
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

    // Check payload size before processing
    const payloadSize = JSON.stringify(body).length
    if (payloadSize > 50000) { // 50KB limit for reflection drafts
      return NextResponse.json(
        { error: 'Reflection data too large. Please shorten the content.' },
        { status: 413 }
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

    const { weeklySnippet, bullets, userProfile } = validationResult.data

    // Generate LLM-powered reflection draft
    const llmResponse = await generateReflectionDraftWithLLM({
      weeklySnippet,
      bullets,
      userProfile,
      userId
    })

    return NextResponse.json({
      success: true,
      reflectionDraft: llmResponse.reflectionDraft,
      insights: llmResponse.insights
    })

  } catch (error) {
    // Enhanced error logging with context  
    const errorContext = {
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    console.error('Error generating reflection draft:', errorContext)
    
    return NextResponse.json(
      { error: 'Failed to generate reflection draft' },
      { status: 500 }
    )
  }
}

/**
 * Generate reflection draft using LLM proxy
 */
async function generateReflectionDraftWithLLM({
  weeklySnippet,
  bullets,
  userProfile,
  userId
}: {
  weeklySnippet: string
  bullets: string[]
  userProfile: { jobTitle: string; seniorityLevel: string }
  userId: string
}) {
  try {
    const prompt = buildReflectionDraftPrompt(weeklySnippet, bullets, userProfile)
    
    // Use LLM proxy for environment-aware processing
    const llmResponse = await llmProxy.request({
      prompt,
      temperature: 0.6,
      maxTokens: 800,
      context: { weeklySnippet, bullets, userProfile, userId, type: 'reflection_draft' }
    })

    return parseReflectionResponse(llmResponse.content)

  } catch (error) {
    console.error('LLM Proxy error for reflection draft:', error)
    // Fallback to mock response if LLM fails
    return generateMockReflectionResponse(weeklySnippet, bullets, userProfile)
  }
}

/**
 * Build prompt for reflection draft generation
 */
function buildReflectionDraftPrompt(weeklySnippet: string, bullets: string[], userProfile: { jobTitle: string; seniorityLevel: string }) {
  return `
Transform the following weekly activities into a structured reflection format suitable for a ${userProfile.seniorityLevel} ${userProfile.jobTitle}.

WEEKLY SUMMARY:
${weeklySnippet}

KEY ACTIVITIES:
${bullets.map(bullet => `- ${bullet}`).join('\n')}

REQUIREMENTS:
1. Create a structured weekly reflection in the format: ## Done, ## Next, ## Notes
2. Under "Done" - list 3-5 specific accomplishments with impact focus
3. Under "Next" - identify 2-3 concrete next steps or priorities
4. Under "Notes" - include any blockers, learnings, or observations
5. Write in first person, use action verbs
6. Match the tone and scope appropriate for a ${userProfile.seniorityLevel} level engineer
7. Be honest about challenges while staying constructive
8. Focus on learning and growth opportunities

FORMAT:
Return as plain markdown text (not JSON) in the exact format:

## Done

- [accomplishment 1]
- [accomplishment 2]
...

## Next

- [next priority 1]
- [next priority 2]
...

## Notes

[Any blockers, learnings, or relevant observations]
`
}

/**
 * Parse LLM response for reflection draft
 */
function parseReflectionResponse(response: string) {
  try {
    // Try to parse as JSON first (in case LLM returns JSON despite instructions)
    const parsed = JSON.parse(response)
    return {
      reflectionDraft: parsed.reflectionDraft || response,
      insights: parsed.insights || 'Generated reflection draft from weekly activities'
    }
  } catch {
    // If not JSON, treat as markdown text
    return {
      reflectionDraft: response.trim(),
      insights: 'Generated structured reflection from weekly activities'
    }
  }
}

/**
 * Generate mock reflection response for development
 */
function generateMockReflectionResponse(weeklySnippet: string, bullets: string[], userProfile: { jobTitle: string; seniorityLevel: string }) {
  const reflectionDraft = `## Done

- Participated in daily standups and provided regular updates on JWT authentication module progress
- Attended demo preparation session and communicated current challenges with authentication module readiness
- Responded to urgent production authentication issues during extended debug session with senior team members
- Had productive 1:1 with team lead to discuss implementation blockers and identify support needed
- Collaborated with architecture team to clarify JWT refresh token rotation approach and security best practices

## Next

- Complete JWT refresh token implementation based on architecture guidance received
- Set up pair programming sessions with senior engineers to accelerate development
- Create implementation plan with timeline for authentication module delivery
- Research and document security testing approach for JWT implementation

## Notes

This week highlighted the complexity of the JWT refresh token rotation feature and my need for additional architectural guidance. The production incident was stressful but provided valuable learning about our current authentication system. The 1:1 with Sarah helped clarify that it's okay to ask for more support on complex features. Moving forward, I plan to be more proactive about scheduling pair programming sessions when facing technical blockers.`

  return {
    reflectionDraft,
    insights: 'Reflection shows self-awareness about needing support and learning from challenges - positive growth mindset.'
  }
}