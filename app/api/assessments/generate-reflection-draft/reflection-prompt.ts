/**
 * Reflection Draft Prompt Builder
 * 
 * Builds prompts for generating structured weekly reflections from snippet data.
 */

export interface ReflectionPromptContext {
  weeklySnippet: string
  bullets: string[]
  userProfile: {
    jobTitle: string
    seniorityLevel: string
  }
}

/**
 * Build reflection draft prompt from weekly snippet and bullets
 */
export function buildReflectionDraftPrompt(context: ReflectionPromptContext): string {
  const { weeklySnippet, bullets, userProfile } = context
  
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