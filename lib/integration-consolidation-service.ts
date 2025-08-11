/**
 * Integration Consolidation Service
 * 
 * Handles consolidation of raw integration data through LLM processing.
 * Currently focused on calendar integration, but designed to be extensible.
 */

import { llmProxy } from './llmproxy'
import { createUserDataService } from './user-scoped-data'
import { buildCalendarConsolidationPrompt, CalendarConsolidationPromptContext } from './consolidation-prompts/calendar-consolidation-prompt'
import { format, getISOWeek } from 'date-fns'

export interface ConsolidationRequest {
  userId: string
  integrationType: 'google_calendar' // Will expand for other integration types
  weekStart: Date
  weekEnd: Date
  rawIntegrationData: any
  userProfile: {
    name: string
    jobTitle: string
    seniorityLevel: string
  }
  careerGuidelines: string
}

export interface ConsolidatedData {
  summary: string
  keyInsights: string[]
  metrics: Record<string, number>
  contextualData: any
  themes: Array<{
    name: string
    categories: Array<{
      name: string
      evidence: Array<{
        statement: string
        attribution: 'USER' | 'TEAM'
      }>
    }>
  }>
}

export class IntegrationConsolidationService {
  
  /**
   * Process raw integration data through LLM consolidation
   */
  async consolidateWeeklyData(request: ConsolidationRequest): Promise<ConsolidatedData> {
    const { integrationType } = request
    
    switch (integrationType) {
      case 'google_calendar':
        return await this.consolidateCalendarData(request)
      default:
        throw new Error(`Consolidation not implemented for integration type: ${integrationType}`)
    }
  }

  /**
   * Consolidate Google Calendar integration data
   */
  private async consolidateCalendarData(request: ConsolidationRequest): Promise<ConsolidatedData> {
    const { userId, rawIntegrationData, userProfile, careerGuidelines } = request
    
    // Extract calendar events and meeting notes from raw data
    const calendarEvents = rawIntegrationData.keyMeetings || []
    const meetingNotes = rawIntegrationData.meetingContext || []
    
    const promptContext: CalendarConsolidationPromptContext = {
      userName: userProfile.name,
      userRole: userProfile.jobTitle,
      userLevel: userProfile.seniorityLevel,
      careerGuidelines,
      calendarEvents,
      meetingNotes
    }
    
    const prompt = buildCalendarConsolidationPrompt(promptContext)
    
    try {
      // Use LLM proxy for environment-aware processing
      const llmResponse = await llmProxy.request({
        prompt,
        temperature: 0.3, // Lower temperature for more consistent consolidation
        maxTokens: 2000,
        context: { userId, integrationType: 'google_calendar', consolidation: true }
      })

      return this.parseConsolidationResponse(llmResponse.content, rawIntegrationData)

    } catch (error) {
      console.error('LLM Consolidation error:', error)
      throw new Error(`Calendar consolidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Store consolidation results in database
   */
  async storeConsolidation(
    userId: string, 
    request: ConsolidationRequest,
    consolidatedData: ConsolidatedData,
    prompt: string,
    llmModel?: string
  ): Promise<string> {
    const dataService = createUserDataService(userId)
    
    try {
      const weekNumber = this.getWeekNumber(request.weekStart)
      const year = request.weekStart.getFullYear()
      
      const consolidation = await dataService.createIntegrationConsolidation({
        integrationType: request.integrationType,
        weekNumber,
        year,
        weekStart: request.weekStart,
        weekEnd: request.weekEnd,
        rawData: JSON.stringify(request.rawIntegrationData),
        consolidatedSummary: consolidatedData.summary,
        keyInsights: JSON.stringify(consolidatedData.keyInsights),
        consolidatedMetrics: JSON.stringify(consolidatedData.metrics),
        consolidatedContext: JSON.stringify(consolidatedData.contextualData),
        consolidationPrompt: prompt,
        llmModel,
        processingStatus: 'completed',
        consolidatedAt: new Date()
      })

      return consolidation.id
    } finally {
      await dataService.disconnect()
    }
  }

  /**
   * Retrieve consolidations for reflection generation
   */
  async getConsolidationsForReflection(
    userId: string, 
    dateRange: { start: Date; end: Date }
  ): Promise<ConsolidatedData[]> {
    const dataService = createUserDataService(userId)
    
    try {
      const consolidations = await dataService.getIntegrationConsolidations({
        weekStart: dateRange.start,
        weekEnd: dateRange.end,
        processingStatus: 'completed'
      })

      return consolidations.map(consolidation => ({
        summary: consolidation.consolidatedSummary,
        keyInsights: JSON.parse(consolidation.keyInsights),
        metrics: JSON.parse(consolidation.consolidatedMetrics),
        contextualData: JSON.parse(consolidation.consolidatedContext),
        themes: JSON.parse(consolidation.consolidatedContext).themes || []
      }))
    } finally {
      await dataService.disconnect()
    }
  }

  /**
   * Get a specific consolidation by ID
   */
  async getConsolidationById(consolidationId: string, userId: string): Promise<ConsolidatedData | null> {
    const dataService = createUserDataService(userId)
    
    try {
      const consolidation = await dataService.getIntegrationConsolidationById(consolidationId)
      
      if (!consolidation || consolidation.userId !== userId) {
        return null
      }

      return {
        id: consolidation.id,
        summary: consolidation.consolidatedSummary,
        keyInsights: JSON.parse(consolidation.keyInsights),
        metrics: JSON.parse(consolidation.consolidatedMetrics),
        contextualData: JSON.parse(consolidation.consolidatedContext),
        themes: JSON.parse(consolidation.consolidatedContext).themes || [],
        weekStart: consolidation.weekStart,
        weekEnd: consolidation.weekEnd
      } as ConsolidatedData & { id: string; weekStart: Date; weekEnd: Date }
    } finally {
      await dataService.disconnect()
    }
  }

  /**
   * Get the latest consolidation for a user
   */
  async getLatestConsolidation(userId: string): Promise<ConsolidatedData | null> {
    const dataService = createUserDataService(userId)
    
    try {
      const consolidations = await dataService.getIntegrationConsolidations({
        processingStatus: 'completed',
        limit: 1
      })

      if (consolidations.length === 0) {
        return null
      }

      const consolidation = consolidations[0]
      return {
        id: consolidation.id,
        summary: consolidation.consolidatedSummary,
        keyInsights: JSON.parse(consolidation.keyInsights),
        metrics: JSON.parse(consolidation.consolidatedMetrics),
        contextualData: JSON.parse(consolidation.consolidatedContext),
        themes: JSON.parse(consolidation.consolidatedContext).themes || [],
        weekStart: consolidation.weekStart,
        weekEnd: consolidation.weekEnd
      } as ConsolidatedData & { id: string; weekStart: Date; weekEnd: Date }
    } finally {
      await dataService.disconnect()
    }
  }

  /**
   * Parse LLM consolidation response and extract structured data
   */
  private parseConsolidationResponse(response: string, rawData: any): ConsolidatedData {
    try {
      // The response should be structured markdown - parse it
      const themes = this.parseMarkdownThemes(response)
      
      // Extract metrics from raw data
      const metrics = {
        totalMeetings: rawData.totalMeetings || 0,
        meetingHours: this.calculateMeetingHours(rawData.keyMeetings || []),
        weeklyThemes: themes.length
      }

      // Generate summary from themes
      const summary = this.generateSummaryFromThemes(themes)
      
      // Extract key insights
      const keyInsights = this.extractInsightsFromThemes(themes)

      return {
        summary,
        keyInsights,
        metrics,
        contextualData: { themes, rawMarkdown: response },
        themes
      }
    } catch (error) {
      console.error('Error parsing consolidation response:', error)
      // Fallback to basic structure
      return {
        summary: response.substring(0, 500) + '...',
        keyInsights: ['Generated from calendar consolidation'],
        metrics: { totalMeetings: rawData.totalMeetings || 0 },
        contextualData: { rawResponse: response },
        themes: []
      }
    }
  }

  /**
   * Parse markdown response into structured themes
   */
  private parseMarkdownThemes(markdown: string): any[] {
    const themes: any[] = []
    const lines = markdown.split('\n')
    
    let currentTheme: any = null
    let currentCategory: any = null
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Theme headers (### Theme:)
      if (trimmed.startsWith('### Theme:')) {
        if (currentTheme) themes.push(currentTheme)
        currentTheme = {
          name: trimmed.replace('### Theme:', '').trim(),
          categories: []
        }
        currentCategory = null
      }
      
      // Category headers (**Category:**)
      else if (trimmed.startsWith('**Category:')) {
        if (currentTheme) {
          currentCategory = {
            name: trimmed.replace('**Category:', '').replace('**', '').trim(),
            evidence: []
          }
          currentTheme.categories.push(currentCategory)
        }
      }
      
      // Evidence bullets (* **Evidence:**)
      else if (trimmed.startsWith('* **Evidence:**')) {
        if (currentCategory) {
          const statement = trimmed.replace('* **Evidence:**', '').replace(/^"|"$/g, '').trim()
          currentCategory.evidence.push({
            statement,
            attribution: 'USER' // Default, will be updated by next line
          })
        }
      }
      
      // Attribution (* **Attribution:**)
      else if (trimmed.startsWith('* **Attribution:**')) {
        if (currentCategory && currentCategory.evidence.length > 0) {
          const attribution = trimmed.replace('* **Attribution:**', '').trim()
          const lastEvidence = currentCategory.evidence[currentCategory.evidence.length - 1]
          lastEvidence.attribution = attribution.includes('TEAM') ? 'TEAM' : 'USER'
        }
      }
    }
    
    // Don't forget the last theme
    if (currentTheme) themes.push(currentTheme)
    
    return themes
  }

  /**
   * Generate summary from structured themes
   */
  private generateSummaryFromThemes(themes: any[]): string {
    if (themes.length === 0) {
      return 'Weekly consolidation completed with calendar integration data.'
    }
    
    const themeNames = themes.map(t => t.name).join(', ')
    const totalEvidence = themes.reduce((sum, theme) => 
      sum + theme.categories.reduce((catSum: number, cat: any) => catSum + cat.evidence.length, 0), 0
    )
    
    return `This week focused on ${themes.length} main theme(s): ${themeNames}. Generated ${totalEvidence} evidence statements across various performance categories based on calendar activities and meeting participation.`
  }

  /**
   * Extract key insights from themes
   */
  private extractInsightsFromThemes(themes: any[]): string[] {
    const insights: string[] = []
    
    for (const theme of themes) {
      const categoryNames = theme.categories.map((cat: any) => cat.name)
      if (categoryNames.length > 0) {
        insights.push(`${theme.name}: Active in ${categoryNames.join(', ')}`)
      }
    }
    
    if (insights.length === 0) {
      insights.push('Calendar data processed and consolidated successfully')
    }
    
    return insights
  }

  /**
   * Calculate meeting hours from calendar events
   */
  private calculateMeetingHours(meetings: any[]): number {
    return meetings.reduce((total, meeting) => {
      if (meeting.start?.dateTime && meeting.end?.dateTime) {
        const start = new Date(meeting.start.dateTime)
        const end = new Date(meeting.end.dateTime)
        const durationMs = end.getTime() - start.getTime()
        return total + (durationMs / (1000 * 60 * 60)) // Convert to hours
      }
      return total
    }, 0)
  }

  /**
   * Get ISO week number for a given date
   * Uses date-fns for standardized week calculation
   */
  private getWeekNumber(date: Date): number {
    return getISOWeek(date)
  }

}

// Export singleton instance
export const integrationConsolidationService = new IntegrationConsolidationService()