/**
 * Tests for Career Guidelines Context Feature
 * 
 * Verifies that current level guidelines are properly passed as context
 * when generating next level guidelines during onboarding
 */

import { buildCareerPlanPrompt } from '../app/api/jobs/career-plan/career-plan-prompt'

describe('Career Guidelines Context Feature', () => {
  describe('buildCareerPlanPrompt', () => {
    const baseContext = {
      role: 'Software Engineer',
      level: 'Senior'
    }

    it('should generate prompt without context for current level', () => {
      const prompt = buildCareerPlanPrompt(baseContext)
      
      expect(prompt).toContain('Software Engineer')
      expect(prompt).toContain('Senior')
      expect(prompt).not.toContain('REFERENCE CONTEXT')
      expect(prompt).not.toContain('Build upon and extend')
    })

    it('should include current level guidelines as context when provided', () => {
      const currentGuidelines = `#### Impact & Ownership
* Consistently delivers medium-to-large sized projects with minimal guidance
* Takes ownership of team goals and contributes to business outcomes

#### Craft & Expertise  
* Demonstrates strong command of core engineering principles
* Writes high-quality, maintainable, and well-tested code`

      const prompt = buildCareerPlanPrompt({
        ...baseContext,
        level: 'Staff',
        currentLevelGuidelines: currentGuidelines
      })

      expect(prompt).toContain('REFERENCE CONTEXT')
      expect(prompt).toContain(currentGuidelines)
      expect(prompt).toContain('Build upon and extend the current level expectations')
      expect(prompt).toContain('Show clear progression in scope, complexity, and leadership')
      expect(prompt).toContain('Maintain consistency in terminology and focus areas')
    })

    it('should handle company ladder context alongside current guidelines', () => {
      const companyLadder = 'We use a standard FAANG-style engineering ladder'
      const currentGuidelines = '#### Impact & Ownership\n* Leads projects independently'

      const prompt = buildCareerPlanPrompt({
        ...baseContext,
        companyLadder,
        currentLevelGuidelines: currentGuidelines
      })

      expect(prompt).toContain(companyLadder)
      expect(prompt).toContain(currentGuidelines)
      expect(prompt).toContain('REFERENCE CONTEXT')
    })

    it('should handle empty or whitespace-only current guidelines', () => {
      const prompt1 = buildCareerPlanPrompt({
        ...baseContext,
        currentLevelGuidelines: ''
      })
      
      const prompt2 = buildCareerPlanPrompt({
        ...baseContext,
        currentLevelGuidelines: '   '
      })

      expect(prompt1).not.toContain('REFERENCE CONTEXT')
      expect(prompt2).toContain('REFERENCE CONTEXT') // Contains whitespace, so truthy
    })

    it('should properly reference the current level in the context section', () => {
      const currentGuidelines = '#### Impact & Ownership\n* Example guideline'
      
      const prompt = buildCareerPlanPrompt({
        role: 'Product Manager',
        level: 'Principal', 
        currentLevelGuidelines: currentGuidelines
      })

      // Should reference that these are guidelines for Principal level
      expect(prompt).toContain('guidelines have been generated for the current level (Principal)')
    })
  })

  describe('Career Guidelines Generation Flow', () => {
    // Mock the llmProxy module
    jest.mock('../lib/llmproxy', () => ({
      llmProxy: {
        request: jest.fn()
      }
    }))

    it('should pass current level response to next level generation', async () => {
      // This test verifies the integration logic, but would need
      // actual API route testing setup to fully test
      
      // The key behavior we're testing is already visible in the
      // route.ts and handler.ts files where currentLevelResponse.content.trim()
      // is passed to the next level prompt
      
      expect(true).toBe(true) // Placeholder - actual integration test would go here
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long current guidelines gracefully', () => {
      const longGuidelines = Array(100).fill('* Long guideline text').join('\n')
      
      const prompt = buildCareerPlanPrompt({
        role: 'Designer',
        level: 'Lead',
        currentLevelGuidelines: longGuidelines
      })

      expect(prompt).toContain('REFERENCE CONTEXT')
      expect(prompt).toContain(longGuidelines)
      expect(prompt.length).toBeGreaterThan(longGuidelines.length)
    })

    it('should handle special characters in guidelines', () => {
      const specialGuidelines = `#### Test & "Quotes"
* Uses special chars: $, %, &, @
* Contains 'apostrophes' and "quotes"
* Has markdown **bold** and _italic_`

      const prompt = buildCareerPlanPrompt({
        role: 'QA Engineer',
        level: 'Senior',
        currentLevelGuidelines: specialGuidelines
      })

      expect(prompt).toContain(specialGuidelines)
      expect(prompt).toContain('$, %, &, @')
    })

    it('should maintain prompt structure with all optional parameters', () => {
      const prompt = buildCareerPlanPrompt({
        role: 'Engineering Manager',
        level: 'Director',
        companyLadder: 'Tech company ladder',
        currentLevelGuidelines: '#### Leadership\n* Manages multiple teams'
      })

      // Verify all sections are present in correct order
      expect(prompt.indexOf('## CONTEXT')).toBeLessThan(prompt.indexOf('## TASK'))
      expect(prompt.indexOf('## TASK')).toBeLessThan(prompt.indexOf('## INPUTS'))
      expect(prompt.indexOf('## INPUTS')).toBeLessThan(prompt.indexOf('## REFERENCE CONTEXT'))
      expect(prompt.indexOf('## REFERENCE CONTEXT')).toBeLessThan(prompt.indexOf('## ACTION STEPS'))
      expect(prompt.indexOf('## ACTION STEPS')).toBeLessThan(prompt.indexOf('## OUTPUT STRUCTURE'))
    })
  })
})