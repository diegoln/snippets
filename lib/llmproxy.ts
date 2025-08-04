/**
 * LLMProxy - Google Gemini Implementation
 * 
 * Unified implementation using Google Gemini for both development and production.
 * This provides consistent LLM behavior across all environments.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AssessmentContext, ASSESSMENT_CONSTANTS } from '../types/performance'

export interface LLMProxyRequest {
  prompt: string
  context?: any
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface LLMProxyResponse {
  content: string
  usage?: {
    tokens: number
    cost?: number
  }
  model: string
}

/**
 * LLMProxy client using Google Gemini
 */
export class LLMProxyClient {
  private genAI: GoogleGenerativeAI | null = null
  private model: string
  private geminiApiKey?: string

  constructor() {
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    this.geminiApiKey = process.env.GEMINI_API_KEY
    
    if (this.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(this.geminiApiKey)
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found. Using mock responses.')
    }
  }

  /**
   * Generate performance assessment draft using Gemini
   */
  async generatePerformanceAssessment(context: AssessmentContext): Promise<LLMProxyResponse> {
    const prompt = this.buildPerformanceAssessmentPrompt(context)
    
    try {
      if (this.genAI) {
        return await this.callGemini(prompt)
      } else {
        // Fallback to mock when API key not configured
        const delay = ASSESSMENT_CONSTANTS.GENERATION_DELAY_MIN + 
          Math.random() * (ASSESSMENT_CONSTANTS.GENERATION_DELAY_MAX - ASSESSMENT_CONSTANTS.GENERATION_DELAY_MIN)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.getMockAssessmentResponse(context)
      }
    } catch (error) {
      console.error('LLMProxy error:', error)
      return this.getMockAssessmentResponse(context)
    }
  }

  /**
   * Generate weekly snippet from integration data
   */
  async generateWeeklySnippet(calendarData: any, userProfile: { jobTitle: string; seniorityLevel: string }): Promise<LLMProxyResponse> {
    const prompt = this.buildWeeklySnippetPrompt(calendarData, userProfile)
    
    try {
      if (this.genAI) {
        return await this.callGemini(prompt, 0.7, 1000)
      } else {
        // Fallback to mock when API key not configured
        await new Promise(resolve => setTimeout(resolve, 2000))
        return this.getMockWeeklySnippetResponse(calendarData, userProfile)
      }
    } catch (error) {
      console.error('LLMProxy weekly snippet error:', error)
      return this.getMockWeeklySnippetResponse(calendarData, userProfile)
    }
  }

  /**
   * Generate reflection draft from weekly snippet and bullets
   */
  async generateReflectionDraft(weeklySnippet: string, bullets: string[], userProfile: { jobTitle: string; seniorityLevel: string }): Promise<LLMProxyResponse> {
    const prompt = this.buildReflectionDraftPrompt(weeklySnippet, bullets, userProfile)
    
    try {
      if (this.genAI) {
        return await this.callGemini(prompt, 0.6, 800)
      } else {
        // Fallback to mock when API key not configured
        await new Promise(resolve => setTimeout(resolve, 1500))
        return this.getMockReflectionDraftResponse(weeklySnippet, bullets, userProfile)
      }
    } catch (error) {
      console.error('LLMProxy reflection draft error:', error)
      return this.getMockReflectionDraftResponse(weeklySnippet, bullets, userProfile)
    }
  }

  /**
   * Generic LLM request method
   */
  async request(request: LLMProxyRequest): Promise<LLMProxyResponse> {
    try {
      if (this.genAI) {
        return await this.callGemini(request.prompt, request.temperature, request.maxTokens)
      } else {
        // Fallback: check request type and route appropriately
        if (request.context?.calendarData && request.context?.userProfile) {
          return await this.generateWeeklySnippet(request.context.calendarData, request.context.userProfile)
        }
        
        if (request.context?.type === 'reflection_draft') {
          return await this.generateReflectionDraft(request.context.weeklySnippet, request.context.bullets, request.context.userProfile)
        }
        
        // Default mock response when API key not configured
        return {
          content: "This is a mock response. Please configure GEMINI_API_KEY to use real Gemini AI.",
          model: this.model,
          usage: {
            tokens: 100
          }
        }
      }
    } catch (error) {
      console.error('LLMProxy request error:', error)
      throw new Error('LLMProxy request failed')
    }
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(prompt: string, temperature = 0.7, maxTokens = 2000): Promise<LLMProxyResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API not configured')
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Check for empty response - might indicate model or content filtering issues
      if (!text || text.trim().length === 0) {
        throw new Error(`Gemini returned empty response - check model name "${this.model}" or content filters`)
      }

      return {
        content: text,
        model: this.model,
        usage: {
          tokens: response.usageMetadata?.totalTokenCount || 0,
          cost: this.calculateGeminiCost(response.usageMetadata?.totalTokenCount || 0)
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculate approximate cost for Gemini usage
   */
  private calculateGeminiCost(tokens: number): number {
    // Gemini 1.5 Flash pricing (as of 2024): 
    // Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens
    // Rough estimate: $0.0001 per 1K tokens average (much cheaper than OpenAI)
    return (tokens / 1000) * 0.0001
  }

  /**
   * Build weekly snippet prompt from calendar data
   */
  private buildWeeklySnippetPrompt(calendarData: any, userProfile: { jobTitle: string; seniorityLevel: string }): string {
    return `
Create a weekly snippet for a ${userProfile.seniorityLevel} ${userProfile.jobTitle} based on their calendar data from ${calendarData.dateRange.start} to ${calendarData.dateRange.end}.

CALENDAR DATA:
- Total meetings: ${calendarData.totalMeetings}
- Weekly summary: ${calendarData.weeklyContextSummary}

MEETING DETAILS:
${calendarData.meetingContext.join('\n')}

KEY MEETINGS:
${calendarData.keyMeetings.map((meeting: any) => 
  `- ${meeting.summary}${meeting.description ? ': ' + meeting.description : ''}`
).join('\n')}

REQUIREMENTS:
1. Write 4-6 bullet points highlighting key accomplishments and activities
2. Focus on impact, collaboration, and technical contributions
3. Use action verbs and quantify when possible
4. Mention specific meetings that show leadership or technical expertise
5. Include any blockers or challenges in a constructive way
6. Match the tone appropriate for a ${userProfile.seniorityLevel} level engineer

FORMAT:
Return your response as JSON with:
{
  "weeklySnippet": "Full paragraph summary",
  "bullets": ["bullet 1", "bullet 2", ...],
  "insights": "Brief insight about performance patterns"
}
`
  }

  /**
   * Build reflection draft prompt from weekly snippet and bullets
   */
  private buildReflectionDraftPrompt(weeklySnippet: string, bullets: string[], userProfile: { jobTitle: string; seniorityLevel: string }): string {
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
Return as plain markdown text in the exact format:

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
   * Build performance assessment prompt from context
   */
  private buildPerformanceAssessmentPrompt(context: AssessmentContext): string {
    const { userProfile, weeklySnippets, cyclePeriod, previousFeedback, checkInFocusAreas } = context

    return `You are an expert performance review assistant. Create a comprehensive self-assessment for a ${userProfile.seniorityLevel} ${userProfile.jobTitle}.

CONTEXT:
- Performance Cycle: ${cyclePeriod.cycleName} (${cyclePeriod.startDate} to ${cyclePeriod.endDate})
- Role: ${userProfile.seniorityLevel} ${userProfile.jobTitle}
- Previous Feedback: ${previousFeedback || 'None provided'}
${checkInFocusAreas ? `- Special Directions: ${checkInFocusAreas}` : ''}

WEEKLY ACCOMPLISHMENTS:
${weeklySnippets.map(snippet => `Week ${snippet.weekNumber}: ${snippet.content}`).join('\n')}

REQUIREMENTS:
1. Write a professional self-assessment (max 2 pages)
2. Focus on high-level impact and achievements
3. Align with expectations for ${userProfile.seniorityLevel} level
4. Include sections: Executive Summary, Key Accomplishments, Technical Impact, Growth Areas, Level Alignment
5. Avoid granular details - focus on strategic contributions
6. Make it suitable for manager and performance committee review
${checkInFocusAreas ? `7. Follow the provided special directions: ${checkInFocusAreas}` : ''}

Generate the self-assessment in markdown format:`
  }

  /**
   * Generate mock assessment response for development
   */
  private getMockAssessmentResponse(context: AssessmentContext): LLMProxyResponse {
    const { userProfile, weeklySnippets, cyclePeriod } = context

    const content = `# ${cyclePeriod.cycleName} - Career Check-In Draft

## Executive Summary
During the ${cyclePeriod.cycleName} period, I successfully executed on key engineering initiatives while contributing to team growth and organizational objectives. As a ${userProfile.seniorityLevel} ${userProfile.jobTitle}, I focused on delivering high-impact technical solutions and mentoring team members.

*This draft serves as preparation material for career conversations and performance discussions.*

## Key Accomplishments
Based on my weekly activities during this cycle:

${weeklySnippets.slice(0, 5).map(snippet => 
  `- **Week ${snippet.weekNumber}**: ${snippet.content.split('.')[0].replace(/^This week I |^I |^Focused on /, '').trim()}`
).join('\n')}

${weeklySnippets.length > 5 ? `- Plus ${weeklySnippets.length - 5} additional weeks of consistent delivery` : ''}

## Technical Impact & Leadership
- **System Architecture**: Led critical design decisions that improved system scalability and maintainability
- **Code Quality**: Implemented best practices that elevated team standards and reduced technical debt  
- **Mentorship**: Provided guidance to junior engineers, accelerating their professional development
- **Cross-functional Collaboration**: Built strong partnerships across product, design, and business teams

## Strategic Contributions
- Delivered features that directly supported business objectives and user experience improvements
- Contributed to technical strategy discussions and architectural roadmap planning
- Identified and resolved system bottlenecks before they impacted production performance
- Participated in incident response and drove root cause analysis for critical issues

## Growth & Development
- Expanded technical expertise in emerging technologies relevant to our platform
- Enhanced leadership skills through mentoring and technical decision-making opportunities  
- Improved communication effectiveness in cross-team collaboration and documentation
- Developed deeper understanding of business context to inform technical decisions

## Alignment with ${userProfile.seniorityLevel} Level Expectations
This performance period demonstrates consistent execution at the ${userProfile.seniorityLevel} level across key dimensions:

**Technical Excellence**: Delivered complex features with high quality and minimal defects
**System Thinking**: Made architectural decisions that balanced immediate needs with long-term maintainability  
**Leadership**: Mentored team members and influenced technical direction through thoughtful contributions
**Business Impact**: Connected technical work to user value and business outcomes
**Communication**: Effectively documented decisions and communicated status to stakeholders

## Looking Forward
I'm well-positioned to continue growing in the ${userProfile.seniorityLevel} role and ready to take on additional responsibilities in system design, team leadership, and strategic technical initiatives.`

    return {
      content,
      model: this.model,
      usage: {
        tokens: content.length / 4, // Rough token estimate
        cost: 0 // Free for local development
      }
    }
  }

  /**
   * Generate mock weekly snippet response for development
   */
  private getMockWeeklySnippetResponse(calendarData: any, userProfile: { jobTitle: string; seniorityLevel: string }): LLMProxyResponse {
    // Generate Jack-specific realistic content based on his challenging week
    const bullets = [
      'Participated in daily standups and provided updates on JWT authentication module progress',
      'Attended demo prep session and discussed authentication module readiness concerns with PM',
      'Responded to urgent production auth issues during 2-hour debug session with senior engineers',
      'Had extended 1:1 with team lead to discuss implementation blockers and timeline challenges',
      'Collaborated with architecture team on JWT refresh token approach and security considerations'
    ]

    const weeklySnippet = `This week focused primarily on the JWT authentication module implementation, though faced several technical challenges that required additional support. Participated in ${calendarData.totalMeetings} meetings including daily standups, demo preparation, and an urgent production incident response. Had productive architecture discussions with senior team members to clarify implementation approach for refresh token rotation. The week highlighted areas where additional guidance and pair programming could accelerate delivery of the authentication module.`

    const insights = 'Calendar shows high meeting load with focus on getting unblocked. Strong collaboration with senior engineers but may benefit from more structured technical guidance.'

    const content = JSON.stringify({
      weeklySnippet,
      bullets,
      insights
    })

    return {
      content,
      model: this.model,
      usage: {
        tokens: content.length / 4, // Rough token estimate
        cost: 0 // Free for local development
      }
    }
  }

  /**
   * Generate mock reflection draft response for development
   */
  private getMockReflectionDraftResponse(weeklySnippet: string, bullets: string[], userProfile: { jobTitle: string; seniorityLevel: string }): LLMProxyResponse {
    // Generate Jack-specific realistic reflection draft
    const content = `## Done

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
      content,
      model: this.model,
      usage: {
        tokens: content.length / 4, // Rough token estimate
        cost: 0 // Free for local development
      }
    }
  }
}

// Export singleton instance
export const llmProxy = new LLMProxyClient()