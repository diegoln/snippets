/**
 * Weekly Snippet Prompt Builder
 * 
 * Builds prompts for generating weekly snippets from calendar integration data.
 */

export interface WeeklySnippetPromptContext {
  calendarData: {
    dateRange: {
      start: string
      end: string
    }
    totalMeetings: number
    meetingContext: string[]
    keyMeetings: Array<{
      summary: string
      description?: string
    }>
    weeklyContextSummary: string
  }
  userProfile: {
    jobTitle: string
    seniorityLevel: string
  }
}

/**
 * Build weekly snippet prompt from calendar data and user profile
 */
export function buildWeeklySnippetPrompt(context: WeeklySnippetPromptContext): string {
  const { calendarData, userProfile } = context
  
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