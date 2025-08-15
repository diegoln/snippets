/**
 * Weekly Reflection Job Handler
 * 
 * Automatically generates weekly reflections by:
 * 1. Collecting integration data for the week
 * 2. Consolidating the data into themes
 * 3. Retrieving previous context (last week's reflection, insights)
 * 4. Generating a reflection draft with LLM
 * 5. Saving as draft for user review
 */

import { JobHandler, JobContext } from '../types'
import { createUserDataService, UserScopedDataService } from '../../user-scoped-data'
import { integrationConsolidationService, ConsolidatedData } from '../../integration-consolidation-service'
import { GoogleCalendarService } from '../../calendar-integration'
import { llmProxy } from '../../llmproxy'
import { startOfWeek, endOfWeek, subWeeks, format, getISOWeek } from 'date-fns'

interface UserAccount {
  id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
}

interface UserProfile {
  id: string
  name: string | null
  jobTitle: string | null
  seniorityLevel: string | null
  careerProgressionPlan: string | null
}

interface PreviousContext {
  previousReflection: string | null
  previousWeek: {
    weekNumber: number
    year: number
  } | null
  recentInsights: string | null
  assessmentDate: Date | null
}

interface WeeklySnippet {
  id: string
  weekNumber: number
  year: number
  content: string
}

export interface WeeklyReflectionInput {
  userId: string
  weekStart?: Date
  weekEnd?: Date
  includeIntegrations?: string[]
  includePreviousContext?: boolean
  testMode?: boolean // Use mock data for testing
}

export interface WeeklyReflectionResult {
  reflectionId: string
  weekNumber: number
  year: number
  status: 'draft' | 'error'
  content?: string
  consolidationId?: string
  error?: string
}

export class WeeklyReflectionHandler implements JobHandler {
  jobType = 'weekly_reflection_generation'
  estimatedDuration = 180 // 3 minutes estimate

  async process(
    inputData: WeeklyReflectionInput,
    context: JobContext
  ): Promise<WeeklyReflectionResult> {
    const { includePreviousContext = true, testMode = false } = inputData
    
    // Use userId from context instead of inputData to ensure consistency
    // The context.userId comes from the job service and matches the operation's userId
    const userId = context.userId
    
    // Determine week range (default to current week)
    const weekEnd = inputData.weekEnd || endOfWeek(new Date(), { weekStartsOn: 1 })
    const weekStart = inputData.weekStart || startOfWeek(weekEnd, { weekStartsOn: 1 })
    const weekNumber = this.getWeekNumber(weekStart)
    const year = weekStart.getFullYear()

    let dataService: UserScopedDataService | null = null

    try {
      // Step 1: Validate user and get profile
      await context.updateProgress(5, 'Loading user profile')
      dataService = createUserDataService(userId)
      
      const userProfile = await dataService.getUserProfile()
      if (!userProfile) {
        throw new Error('User profile not found')
      }

      // Check if reflection already exists for this week
      const existingReflection = await this.checkExistingReflection(
        dataService,
        weekNumber,
        year
      )
      if (existingReflection) {
        return {
          reflectionId: existingReflection.id,
          weekNumber,
          year,
          status: 'draft',
          content: existingReflection.content
        }
      }

      // Step 2: Collect integration data
      await context.updateProgress(20, testMode ? 'Using mock integration data for testing' : 'Fetching integration data')
      const integrationData = await this.collectIntegrationData(
        userId,
        weekStart,
        weekEnd,
        inputData.includeIntegrations,
        testMode,
        dataService // Pass existing dataService to avoid creating new connections
      )

      if (!integrationData || Object.keys(integrationData).length === 0) {
        throw new Error('No integration data available for this week')
      }

      // Step 3: Consolidate data
      await context.updateProgress(40, 'Consolidating weekly activities')
      const consolidation = await this.consolidateData(
        userId,
        weekStart,
        weekEnd,
        integrationData,
        userProfile,
        dataService
      )

      // Step 4: Get previous context if requested
      let previousContext = null
      if (includePreviousContext) {
        await context.updateProgress(55, 'Retrieving previous insights')
        previousContext = await this.getPreviousContext(
          dataService,
          weekStart
        )
      }

      // Step 5: Generate reflection with LLM
      await context.updateProgress(70, 'Generating reflection with AI')
      const reflectionContent = await this.generateReflection(
        consolidation,
        previousContext,
        userProfile
      )

      // Step 6: Save as draft
      await context.updateProgress(90, 'Saving reflection draft')
      const savedReflection = await this.saveReflectionDraft(
        dataService,
        {
          weekNumber,
          year,
          weekStart,
          weekEnd,
          content: reflectionContent,
          consolidationId: consolidation.id
        }
      )

      return {
        reflectionId: savedReflection.id,
        weekNumber,
        year,
        status: 'draft',
        content: reflectionContent,
        consolidationId: consolidation.id
      }

    } catch (error) {
      console.error('Weekly reflection generation failed:', error)
      return {
        reflectionId: '',
        weekNumber,
        year,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      // Ensure database connection is always cleaned up
      if (dataService) {
        await dataService.disconnect()
      }
    }
  }

  /**
   * Check if a reflection already exists for the week
   */
  private async checkExistingReflection(
    dataService: UserScopedDataService,
    weekNumber: number,
    year: number
  ): Promise<WeeklySnippet | undefined> {
    const snippets = await dataService.getSnippets()
    return snippets.find((s: WeeklySnippet) => 
      s.weekNumber === weekNumber && 
      s.year === year
    )
  }

  /**
   * Collect data from all connected integrations
   */
  private async collectIntegrationData(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
    includeIntegrations?: string[],
    testMode: boolean = false,
    dataService?: UserScopedDataService
  ): Promise<Record<string, unknown>> {
    const integrationData: Record<string, unknown> = {}
    
    // For now, focus on Google Calendar
    // TODO: Add Todoist, GitHub, etc.
    if (!includeIntegrations || includeIntegrations.includes('google_calendar')) {
      try {
        let calendarData
        
        if (testMode) {
          // Use simple mock data for testing
          calendarData = {
            totalMeetings: 3,
            meetingContext: [
              'Monday, Jan 8: Sprint Planning (6 attendees)',
              'Wednesday, Jan 10: 1:1 with Manager',
              'Friday, Jan 12: Code Review Session (4 attendees)'
            ],
            keyMeetings: [
              { summary: 'Sprint Planning', importance: 'high', attendees: 6 },
              { summary: '1:1 with Manager', importance: 'high', attendees: 2 },
              { summary: 'Code Review Session', importance: 'medium', attendees: 4 }
            ],
            weeklyContextSummary: 'Week focused on sprint planning, manager alignment, and code review activities'
          }
        } else {
          calendarData = await this.fetchCalendarData(userId, weekStart, weekEnd, dataService)
        }
        
        if (calendarData) {
          integrationData.google_calendar = calendarData
        }
      } catch (error) {
        console.error('Failed to fetch calendar data:', error)
        
        // Since we're in non-test mode (testMode=false), we can't provide mock data
        // The error will be logged but integration will continue without calendar data
        // This allows the reflection generation to continue with other available data sources
      }
    }

    return integrationData
  }

  /**
   * Fetch calendar data for the week
   */
  private async fetchCalendarData(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
    existingDataService?: UserScopedDataService
  ) {
    // Use existing dataService to avoid creating unnecessary database connections
    const dataService = existingDataService || createUserDataService(userId)
    
    try {
      // Get user's Google account
      const accounts = await dataService.getUserAccounts()
      const googleAccount = accounts.find((a: UserAccount) => a.provider === 'google')
      
      if (!googleAccount || !googleAccount.access_token) {
        console.log('No Google Calendar integration found for user')
        return null
      }

      // Fetch calendar data
      const calendarService = await GoogleCalendarService.create()
      // Convert account format for calendar service
      const accountForCalendar = {
        id: googleAccount.id,
        userId,
        type: 'oauth',
        provider: googleAccount.provider,
        providerAccountId: googleAccount.id,
        access_token: googleAccount.access_token,
        refresh_token: googleAccount.refresh_token,
        expires_at: googleAccount.expires_at
      }
      
      const calendarData = await calendarService.fetchWeeklyData(
        { weekStart, weekEnd, userId },
        accountForCalendar
      )

      return calendarData
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
      throw error
    } finally {
      // Only disconnect if we created the dataService ourselves
      if (!existingDataService) {
        await dataService.disconnect()
      }
    }
  }

  /**
   * Consolidate integration data into themes
   */
  private async consolidateData(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
    integrationData: Record<string, unknown>,
    userProfile: UserProfile,
    dataService: UserScopedDataService
  ): Promise<ConsolidatedData & { id: string }> {
    // Use existing consolidation service
    const consolidatedData = await integrationConsolidationService.consolidateWeeklyData({
      userId,
      integrationType: 'google_calendar',
      weekStart,
      weekEnd,
      rawIntegrationData: integrationData.google_calendar,
      userProfile: {
        name: userProfile.name || 'User',
        jobTitle: userProfile.jobTitle || '',
        seniorityLevel: userProfile.seniorityLevel || ''
      },
      careerGuidelines: userProfile.careerProgressionPlan || ''
    })

    // Store consolidation
    const consolidationId = await integrationConsolidationService.storeConsolidation(
      userId,
      {
        userId,
        integrationType: 'google_calendar',
        weekStart,
        weekEnd,
        rawIntegrationData: integrationData.google_calendar,
        userProfile: {
          name: userProfile.name || 'User',
          jobTitle: userProfile.jobTitle || '',
          seniorityLevel: userProfile.seniorityLevel || ''
        },
        careerGuidelines: userProfile.careerProgressionPlan || ''
      },
      consolidatedData,
      'Weekly reflection automation',
      'gemini-pro',
      dataService // Pass the existing dataService instance
    )

    return { ...consolidatedData, id: consolidationId }
  }

  /**
   * Get previous week's reflection and recent insights
   */
  private async getPreviousContext(
    dataService: UserScopedDataService,
    currentWeekStart: Date
  ): Promise<PreviousContext> {
    const previousWeekStart = subWeeks(currentWeekStart, 1)
    const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 })

    // Get previous week's reflection
    const previousReflections = await dataService.getSnippetsInDateRange(
      previousWeekStart,
      previousWeekEnd
    )
    
    const previousReflection = previousReflections?.[0]

    // Get recent performance assessments
    const assessments = await dataService.getAssessments()
    const recentAssessment = assessments?.[0]

    return {
      previousReflection: previousReflection?.content || null,
      previousWeek: previousReflection ? {
        weekNumber: previousReflection.weekNumber,
        year: previousReflection.year
      } : null,
      recentInsights: recentAssessment?.generatedDraft || null,
      assessmentDate: recentAssessment?.createdAt || null
    }
  }

  /**
   * Generate reflection using LLM with context
   */
  private async generateReflection(
    consolidation: ConsolidatedData & { id: string },
    previousContext: PreviousContext | null,
    userProfile: UserProfile
  ): Promise<string> {
    const prompt = this.buildReflectionPrompt(
      consolidation,
      previousContext,
      userProfile
    )

    const response = await llmProxy.request({
      prompt,
      temperature: 0.7,
      maxTokens: 1500,
      context: {
        type: 'weekly_reflection_automation',
        userId: userProfile.id
      }
    })

    return this.parseReflectionResponse(response.content)
  }

  /**
   * Build comprehensive prompt for reflection generation
   */
  private buildReflectionPrompt(
    consolidation: ConsolidatedData & { id: string },
    previousContext: PreviousContext | null,
    userProfile: UserProfile
  ): string {
    let prompt = `Generate a weekly reflection for a ${userProfile.seniorityLevel || 'professional'} ${userProfile.jobTitle || 'team member'}.

CONSOLIDATED WEEKLY DATA:
${consolidation.summary}

KEY THEMES AND ACTIVITIES:
`
    // Add themes and evidence
    for (const theme of consolidation.themes || []) {
      prompt += `\n### ${theme.name}\n`
      for (const category of theme.categories || []) {
        prompt += `**${category.name}:**\n`
        for (const evidence of category.evidence || []) {
          prompt += `- ${evidence.statement}\n`
        }
      }
    }

    // Add previous context if available
    if (previousContext?.previousReflection) {
      prompt += `\n\nPREVIOUS WEEK'S REFLECTION (for continuity):
${previousContext.previousReflection.substring(0, 500)}...
`
    }

    if (previousContext?.recentInsights) {
      prompt += `\n\nRECENT PERFORMANCE INSIGHTS:
${previousContext.recentInsights}
`
    }

    prompt += `\n\nREQUIREMENTS:
1. Create a structured reflection in the format: ## Done, ## Next, ## Notes
2. Under "Done" - List 3-5 specific accomplishments based on the actual activities
3. Under "Next" - Identify 2-3 concrete next steps based on current priorities
4. Under "Notes" - Include observations about challenges, learnings, or important context
5. Write in first person, using action verbs
6. Maintain continuity with previous week if context provided
7. Be authentic and honest while maintaining a professional tone
8. Focus on impact and outcomes, not just activities

FORMAT:
Return as markdown text with clear sections.`

    return prompt
  }

  /**
   * Parse LLM response to extract reflection content
   */
  private parseReflectionResponse(response: string): string {
    // Clean up the response if needed
    let content = response.trim()
    
    // Remove markdown code block wrappers if present
    // The LLM sometimes returns content wrapped in ```markdown...```
    const markdownCodeBlockRegex = /^```markdown\s*\n([\s\S]*?)\n```$/
    const match = content.match(markdownCodeBlockRegex)
    if (match) {
      content = match[1].trim()
    }
    
    // Also handle cases where it might be wrapped with just ```
    const genericCodeBlockRegex = /^```\s*\n([\s\S]*?)\n```$/
    const genericMatch = content.match(genericCodeBlockRegex)
    if (genericMatch && genericMatch[1].includes('## Done')) {
      content = genericMatch[1].trim()
    }
    
    // Ensure it has the expected sections
    if (!content.includes('## Done') || !content.includes('## Next')) {
      // If missing sections, add basic structure
      return `## Done\n\n${content}\n\n## Next\n\n- Continue with current priorities\n\n## Notes\n\n*Generated reflection - please review and edit as needed*`
    }
    
    return content
  }

  /**
   * Save reflection as draft
   */
  private async saveReflectionDraft(
    dataService: UserScopedDataService,
    reflection: {
      weekNumber: number
      year: number
      weekStart: Date
      weekEnd: Date
      content: string
      consolidationId?: string
    }
  ): Promise<WeeklySnippet> {
    // Store metadata in aiSuggestions field as JSON
    const metadata = {
      generatedAutomatically: true,
      generatedAt: new Date().toISOString(),
      consolidationId: reflection.consolidationId,
      status: 'draft'
    }

    const snippet = await dataService.createSnippet({
      weekNumber: reflection.weekNumber,
      year: reflection.year,
      startDate: reflection.weekStart,
      endDate: reflection.weekEnd,
      content: reflection.content,
      aiSuggestions: JSON.stringify(metadata)
    })

    return snippet
  }

  // Removed custom mock data method - now using existing GoogleCalendarService.generateMockData()

  /**
   * Calculate ISO week number using date-fns
   */
  private getWeekNumber(date: Date): number {
    return getISOWeek(date)
  }
}

// Register the handler
export const weeklyReflectionHandler = new WeeklyReflectionHandler()