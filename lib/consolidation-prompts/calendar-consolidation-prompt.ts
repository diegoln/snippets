/**
 * Calendar Integration Consolidation Prompt
 * 
 * Processes raw calendar data into structured, meaningful context for reflection generation.
 * This is specifically for Google Calendar integration data.
 */

export interface CalendarConsolidationPromptContext {
  userName: string
  userRole: string
  userLevel: string
  careerGuidelines: string
  calendarEvents: Array<{
    id: string
    summary: string
    description?: string
    start: { dateTime: string }
    end: { dateTime: string }
    attendees?: Array<{
      email: string
      displayName?: string
      organizer?: boolean
      self?: boolean
    }>
    location?: string
    status: string
  }>
  meetingNotes: string[]
}

/**
 * Build calendar consolidation prompt for processing raw calendar data
 */
export function buildCalendarConsolidationPrompt(context: CalendarConsolidationPromptContext): string {
  const { userName, userRole, userLevel, careerGuidelines, calendarEvents, meetingNotes } = context
  
  return `## CONTEXT
You are an expert-level AI assistant for "AdvanceWeekly," a career development platform. Your function is to process raw data about a user's work week and transform it into a structured, meaningful context that will be used by downstream AI processes to generate career reflections. The output must be a clean, factual, and self-contained summary of the user's professional contributions, filtered to exclude noise from other individuals' actions.

## OBJECTIVE
Your objective is to analyze the provided inputs and generate a structured summary of the user's weekly activities. This summary must only contain actions, decisions, and outcomes that can be authentically attributed to the user, either individually or as a key contributor to a group effort. Each piece of evidence must be contextualized to be fully understandable on its own.

## INPUTS
1. **userName**: ${userName}
2. **userRole**: ${userRole}
3. **userLevel**: ${userLevel}
4. **careerGuidelines**: ${careerGuidelines}
5. **calendarEvents**: ${JSON.stringify(calendarEvents, null, 2)}
6. **meetingNotes**: ${meetingNotes.join('\n\n---\n\n')}

## CORE INSTRUCTIONS
1. **Identify Weekly Themes:** First, scan all calendar events and meeting notes to identify the main projects, initiatives, or recurring themes of the week (e.g., "Project Phoenix Launch," "Q4 Planning," "Team Process Improvement").

2. **Extract All Potential Actions:** For each theme, scan the inputs for specific actions, decisions, deliverables, or outcomes.

3. **Determine Attribution for Each Action:** For every action identified, determine the actor. Look for names, pronouns ("I," "we"), and other cues to understand who performed the action.

4. **Apply Critical Filtering:** This is the most important step. You MUST filter the extracted actions based on the following rule:
   * **RETAIN** an action only if the actor is the user (${userName}) or a team/group where the user was an active and relevant participant.
   * **DISCARD** all actions where another individual is the sole or primary actor. The goal is to build a list of accomplishments the user can authentically claim.

5. **Generate Self-Contained Evidence:** For each retained action, you must rewrite it as a self-contained "Evidence" statement. This statement must synthesize the action with its surrounding context (e.g., the project name, meeting goal, or problem being solved) so that it is fully understandable without the original source material.
   * *Example Transformation:* Do not just extract "approved the new API." Instead, synthesize and generate: "In the 'API Design Review' for the mobile integration, a new, more efficient API contract was agreed upon with the backend team."

6. **Categorize Evidence:** Using the career guidelines as your guide, map each self-contained Evidence statement to the single most relevant performance category (e.g., \`Impact & Ownership\`, \`Craft & Expertise\`).

7. **Format the Output:** Assemble the final, filtered, and contextualized evidence into the precise Markdown structure specified below.

## OUTPUT STRUCTURE
Generate the output in Markdown format. The structure must be strictly followed. Do not include any content that was filtered out.

### Theme: [Name of the First Identified Theme, e.g., Q4 Product Launch - Project Phoenix]

**Category: [Relevant Category from Career Guidelines, e.g., 🚀 Impact & Ownership]**
* **Evidence:** "[The self-contained, contextualized statement of the user's action or contribution.]"
  * **Attribution:** [USER]
* **Evidence:** "[Another self-contained statement for this category.]"
  * **Attribution:** [TEAM]

**Category: [Another Relevant Category, e.g., 💬 Communication & Collaboration]**
* **Evidence:** "[A self-contained statement for this second category.]"
  * **Attribution:** [USER]

### Theme: [Name of the Second Identified Theme, e.g., Team Process Improvements]

**Category: [Relevant Category from Career Guidelines, e.g., 🌱 Strategic Focus]**
* **Evidence:** "[A self-contained statement for this theme.]"
  * **Attribution:** [USER]`
}