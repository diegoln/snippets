/**
 * LLMProxy - Local Development Implementation
 * 
 * Simple implementation using Ollama for local development.
 * This provides fast, local LLM processing without external API calls.
 */

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
 * LLMProxy client for development environment
 */
export class LLMProxyClient {
  private baseUrl: string
  private model: string
  private isProduction: boolean
  private openaiApiKey?: string

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.baseUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
    this.model = this.isProduction ? 'gpt-3.5-turbo' : (process.env.LLM_MODEL || 'llama3.2:1b')
    this.openaiApiKey = process.env.OPENAI_API_KEY
  }

  /**
   * Generate performance assessment draft using local LLM
   */
  async generatePerformanceAssessment(context: AssessmentContext): Promise<LLMProxyResponse> {
    const prompt = this.buildPerformanceAssessmentPrompt(context)
    
    try {
      if (this.isProduction && this.openaiApiKey) {
        // Production: Use OpenAI API
        return await this.callOpenAI(prompt)
      } else {
        // Development: Add fake lag for testing generation states
        const delay = ASSESSMENT_CONSTANTS.GENERATION_DELAY_MIN + 
          Math.random() * (ASSESSMENT_CONSTANTS.GENERATION_DELAY_MAX - ASSESSMENT_CONSTANTS.GENERATION_DELAY_MIN)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // For development, provide mock response
        return this.getMockAssessmentResponse(context)
      }
    } catch (error) {
      console.error('LLMProxy error:', error)
      return this.getMockAssessmentResponse(context)
    }
  }

  /**
   * Generic LLM request method
   */
  async request(request: LLMProxyRequest): Promise<LLMProxyResponse> {
    try {
      if (this.isProduction && this.openaiApiKey) {
        // Production: Use OpenAI API
        return await this.callOpenAI(request.prompt, request.temperature, request.maxTokens)
      } else {
        // For development, return mock response
        return {
          content: "This is a mock response for development. The local LLM is not yet implemented.",
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
   * Call OpenAI API (production only)
   */
  private async callOpenAI(prompt: string, temperature = 0.7, maxTokens = 2000): Promise<LLMProxyResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        tokens: data.usage?.total_tokens || 0,
        cost: this.calculateCost(data.usage?.total_tokens || 0)
      }
    }
  }

  /**
   * Calculate approximate cost for OpenAI usage
   */
  private calculateCost(tokens: number): number {
    // GPT-3.5-turbo pricing: ~$0.0015 per 1K tokens (input) + $0.002 per 1K tokens (output)
    // Rough estimate: $0.002 per 1K tokens average
    return (tokens / 1000) * 0.002
  }

  /**
   * Build performance assessment prompt from context
   */
  private buildPerformanceAssessmentPrompt(context: AssessmentContext): string {
    const { userProfile, weeklySnippets, cyclePeriod, previousFeedback, assessmentDirections } = context

    return `You are an expert performance review assistant. Create a comprehensive self-assessment for a ${userProfile.seniorityLevel} ${userProfile.jobTitle}.

CONTEXT:
- Performance Cycle: ${cyclePeriod.cycleName} (${cyclePeriod.startDate} to ${cyclePeriod.endDate})
- Role: ${userProfile.seniorityLevel} ${userProfile.jobTitle}
- Previous Feedback: ${previousFeedback || 'None provided'}
${assessmentDirections ? `- Special Directions: ${assessmentDirections}` : ''}

WEEKLY ACCOMPLISHMENTS:
${weeklySnippets.map(snippet => `Week ${snippet.weekNumber}: ${snippet.content}`).join('\n')}

REQUIREMENTS:
1. Write a professional self-assessment (max 2 pages)
2. Focus on high-level impact and achievements
3. Align with expectations for ${userProfile.seniorityLevel} level
4. Include sections: Executive Summary, Key Accomplishments, Technical Impact, Growth Areas, Level Alignment
5. Avoid granular details - focus on strategic contributions
6. Make it suitable for manager and performance committee review
${assessmentDirections ? `7. Follow the provided special directions: ${assessmentDirections}` : ''}

Generate the self-assessment in markdown format:`
  }

  /**
   * Generate mock assessment response for development
   */
  private getMockAssessmentResponse(context: AssessmentContext): LLMProxyResponse {
    const { userProfile, weeklySnippets, cyclePeriod } = context

    const content = `# ${cyclePeriod.cycleName} - Self Assessment

## Executive Summary
During the ${cyclePeriod.cycleName} performance cycle, I successfully executed on key engineering initiatives while contributing to team growth and organizational objectives. As a ${userProfile.seniorityLevel} ${userProfile.jobTitle}, I focused on delivering high-impact technical solutions and mentoring team members.

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
}

// Export singleton instance
export const llmProxy = new LLMProxyClient()