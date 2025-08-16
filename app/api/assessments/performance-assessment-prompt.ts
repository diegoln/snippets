/**
 * Performance Assessment Prompt Builder
 * 
 * Builds prompts for generating performance assessments from weekly snippets.
 */

import { AssessmentContext, Theme, Category, Evidence } from '../../../types/performance'

/**
 * Build performance assessment prompt from context
 */
export function buildPerformanceAssessmentPrompt(context: AssessmentContext): string {
  const { userProfile, consolidatedData, cyclePeriod, previousFeedback, checkInFocusAreas } = context

  return `You are an expert performance review assistant. Create a comprehensive self-assessment for a ${userProfile.seniorityLevel} ${userProfile.jobTitle}.

CONTEXT:
- Performance Cycle: ${cyclePeriod.cycleName} (${cyclePeriod.startDate} to ${cyclePeriod.endDate})
- Role: ${userProfile.seniorityLevel} ${userProfile.jobTitle}
- Previous Feedback: ${previousFeedback || 'None provided'}
${checkInFocusAreas ? `- Special Directions: ${checkInFocusAreas}` : ''}

CONSOLIDATED WORK ACTIVITIES:
${consolidatedData.map(consolidation => {
  const themesText = consolidation.themes.map((theme: Theme) => 
    `${theme.name}: ${theme.categories.map((cat: Category) => cat.evidence.map((e: Evidence) => e.statement).join(', ')).join('; ')}`
  ).join('\n  ')
  
  return `Week ${consolidation.weekNumber} (${consolidation.startDate} to ${consolidation.endDate}) - ${consolidation.integrationType}:
  Summary: ${consolidation.summary}
  Key Insights: ${consolidation.keyInsights.join(', ')}
  Themes & Evidence:
  ${themesText}`
}).join('\n\n')}

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