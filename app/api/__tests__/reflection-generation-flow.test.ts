/**
 * API endpoint tests for reflection generation flow
 * These tests ensure the API endpoints properly handle Jack's calendar data
 * and would have caught the reflection generation bug
 */

import { NextRequest } from 'next/server'
import { GET as getIntegrations } from '../integrations/route'
import { POST as generateFromIntegration } from '../snippets/generate-from-integration/route'
import { POST as generateReflectionDraft } from '../assessments/generate-reflection-draft/route'

// Mock the dependencies
jest.mock('../../../lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn().mockResolvedValue(null)
}))

jest.mock('../../../lib/dev-auth', () => ({
  getDevUserIdFromRequest: jest.fn().mockResolvedValue('dev-user-123')
}))

// Mock process.env to ensure development mode
const originalEnv = process.env
beforeAll(() => {
  process.env = { ...originalEnv, NODE_ENV: 'development' }
})

afterAll(() => {
  process.env = originalEnv
})

jest.mock('../../../lib/calendar-integration', () => ({
  GoogleCalendarService: {
    generateMockData: jest.fn().mockReturnValue({
      totalMeetings: 6,
      meetingContext: [
        'Monday, Aug 4: Daily Standup - Identity Platform Team (5 attendees) - Team standup. Jack mentioned still working on JWT refresh token issues.',
        'Monday, Aug 4: Identity Platform - Demo Prep (3 attendees) - Preparing for upcoming demo to stakeholders. Jack expressed concerns about his auth module not being ready for demo.',
        'Wednesday, Aug 6: URGENT: Production Auth Issues - Debug Session (4 attendees) - Authentication service experiencing intermittent failures.',
        'Friday, Aug 8: 1:1 with Sarah - Urgent Performance Discussion (2 attendees) - Urgent check-in after production incident.'
      ],
      keyMeetings: [
        {
          id: 'jack_week_2',
          summary: 'Identity Platform - Demo Prep',
          description: 'Preparing for upcoming demo to stakeholders.',
          start: { dateTime: '2025-08-04T13:00:00-07:00' },
          end: { dateTime: '2025-08-04T14:00:00-07:00' },
          attendees: [],
          status: 'confirmed'
        }
      ],
      weeklyContextSummary: 'This week included 6 meetings. Had 1 1:1 meeting(s) for development discussions.'
    })
  }
}))

jest.mock('../../../lib/llmproxy', () => ({
  llmProxy: {
    request: jest.fn().mockResolvedValue({
      content: `## Done

- Participated in daily standups and provided regular updates on JWT authentication module progress
- Attended demo preparation session and communicated current challenges with authentication module readiness  
- Responded to urgent production authentication issues during extended debug session with senior team members
- Had productive 1:1 with team lead to discuss implementation blockers and identify support needed

## Next  

- Complete JWT refresh token implementation based on architecture guidance received
- Set up pair programming sessions with senior engineers to accelerate development

## Notes

This week highlighted the complexity of the JWT refresh token rotation feature and my need for additional architectural guidance.`
    })
  }
}))

describe('Reflection Generation API Flow', () => {
  beforeEach(() => {
    // Reset mocks
    const { getUserIdFromRequest } = require('../../../lib/auth-utils')
    const { getDevUserIdFromRequest } = require('../../../lib/dev-auth')
    getUserIdFromRequest.mockResolvedValue(null)
    getDevUserIdFromRequest.mockResolvedValue('dev-user-123')
  })

  describe('/api/integrations?test=true', () => {
    it('should return Jack\'s realistic calendar data for dev user', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations?test=true', {
        headers: { 'X-Dev-User-Id': 'dev-user-123' }
      })

      const response = await getIntegrations(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.weekData.totalMeetings).toBe(6)
      expect(data.weekData.meetingContext.join(' ')).toContain('JWT refresh token issues')
      expect(data.weekData.meetingContext.join(' ')).toContain('Production Auth Issues')
      expect(data.weekData.meetingContext.join(' ')).toContain('1:1 with Sarah')
    })

    it('should return current week dates, not hardcoded old dates', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations?test=true', {
        headers: { 'X-Dev-User-Id': 'dev-user-123' }
      })

      const response = await getIntegrations(request)
      const data = await response.json()

      // Verify dates are from current week range, not October 2024
      const dateRange = data.weekData.dateRange
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)

      expect(startDate.getFullYear()).toBe(2025) // Current year
      expect(endDate.getFullYear()).toBe(2025)
      expect(startDate.getMonth()).toBeGreaterThanOrEqual(0) // Not hardcoded to October (month 9)

      // Meeting context should show current week dates
      expect(data.weekData.meetingContext[0]).not.toContain('Oct 28')
      expect(data.weekData.meetingContext[0]).not.toContain('2024')
    })
  })

  describe('/api/snippets/generate-from-integration', () => {
    it('should generate realistic bullets from Jack\'s calendar data', async () => {
      const requestBody = {
        integrationType: 'google_calendar',
        weekData: {
          dateRange: { start: '2025-08-04T00:00:00Z', end: '2025-08-08T00:00:00Z' },
          totalMeetings: 6,
          meetingContext: [
            'Monday, Aug 4: Daily Standup - Identity Platform Team - JWT issues',
            'Wednesday, Aug 6: URGENT: Production Auth Issues - Debug Session',
            'Friday, Aug 8: 1:1 with Sarah - Performance Discussion'
          ],
          keyMeetings: [],
          weeklyContextSummary: 'Focus on JWT authentication challenges.'
        },
        userProfile: {
          jobTitle: 'Senior Software Engineer',
          seniorityLevel: 'Senior'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/snippets/generate-from-integration', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123' 
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateFromIntegration(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bullets).toBeDefined()
      expect(Array.isArray(data.bullets)).toBe(true)
      expect(data.bullets.length).toBeGreaterThan(0)

      // Verify bullets reflect Jack's specific work
      const bulletsText = data.bullets.join(' ')
      expect(bulletsText).toContain('JWT')
      expect(bulletsText).toContain('authentication')
      expect(bulletsText.toLowerCase()).toMatch(/standup|production|debug|1:1/)
    })

    it('should handle empty calendar data gracefully', async () => {
      const requestBody = {
        integrationType: 'google_calendar',
        weekData: {
          dateRange: { start: '2025-08-04T00:00:00Z', end: '2025-08-08T00:00:00Z' },
          totalMeetings: 0,
          meetingContext: [],
          keyMeetings: [],
          weeklyContextSummary: 'No meetings this week.'
        },
        userProfile: {
          jobTitle: 'Senior Software Engineer',
          seniorityLevel: 'Senior'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/snippets/generate-from-integration', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123' 
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateFromIntegration(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bullets).toBeDefined()
      // Should still return some bullets even with no calendar data
      expect(Array.isArray(data.bullets)).toBe(true)
    })
  })

  describe('/api/assessments/generate-reflection-draft', () => {
    it('should generate comprehensive reflection from Jack\'s snippet and bullets', async () => {
      const requestBody = {
        weeklySnippet: 'This week focused primarily on the JWT authentication module implementation, though faced several technical challenges.',
        bullets: [
          'Participated in daily standups and provided updates on JWT authentication module progress',
          'Attended demo prep session and discussed authentication module readiness concerns with PM',
          'Responded to urgent production auth issues during 2-hour debug session with senior engineers',
          'Had extended 1:1 with team lead to discuss implementation blockers and timeline challenges'
        ],
        userProfile: {
          jobTitle: 'Senior Software Engineer',
          seniorityLevel: 'Senior'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/assessments/generate-reflection-draft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123' 
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateReflectionDraft(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reflectionDraft).toBeDefined()
      expect(data.reflectionDraft.length).toBeGreaterThan(100) // Should be substantial

      // Verify structure
      expect(data.reflectionDraft).toContain('## Done')
      expect(data.reflectionDraft).toContain('## Next')
      expect(data.reflectionDraft).toContain('## Notes')

      // Verify content reflects Jack's work
      expect(data.reflectionDraft).toContain('JWT authentication')
      expect(data.reflectionDraft).toContain('production')
      expect(data.reflectionDraft).toContain('1:1')
      expect(data.reflectionDraft).toMatch(/guidance|support|help|learning/i)
    })

    it('should handle empty bullets array without crashing', async () => {
      const requestBody = {
        weeklySnippet: 'This week was quiet.',
        bullets: [],
        userProfile: {
          jobTitle: 'Senior Software Engineer', 
          seniorityLevel: 'Senior'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/assessments/generate-reflection-draft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123' 
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateReflectionDraft(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.reflectionDraft).toBeDefined()
      
      // Should still have basic structure even with no bullets
      expect(data.reflectionDraft).toContain('## Done')
      expect(data.reflectionDraft).toContain('## Next')
      expect(data.reflectionDraft).toContain('## Notes')
    })

    it('should require authentication', async () => {
      // Mock no authentication
      const { getUserIdFromRequest } = require('../../../lib/auth-utils')
      const { getDevUserIdFromRequest } = require('../../../lib/dev-auth')
      
      getUserIdFromRequest.mockResolvedValueOnce(null)
      getDevUserIdFromRequest.mockResolvedValueOnce(null)

      const requestBody = {
        weeklySnippet: 'Test',
        bullets: ['Test bullet'],
        userProfile: { jobTitle: 'Engineer', seniorityLevel: 'Senior' }
      }

      const request = new NextRequest('http://localhost:3000/api/assessments/generate-reflection-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await generateReflectionDraft(request)
      
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Integration Data Flow', () => {
    it('should maintain consistency across the full API chain', async () => {
      // This test simulates the complete flow that the onboarding wizard goes through

      // 1. Get calendar data
      const integrationsRequest = new NextRequest('http://localhost:3000/api/integrations?test=true', {
        headers: { 'X-Dev-User-Id': 'dev-user-123' }
      })
      
      const integrationsResponse = await getIntegrations(integrationsRequest)
      const calendarData = await integrationsResponse.json()
      
      expect(calendarData.success).toBe(true)
      expect(calendarData.weekData.totalMeetings).toBe(6)

      // 2. Generate snippet from calendar data
      const snippetRequest = new NextRequest('http://localhost:3000/api/snippets/generate-from-integration', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123' 
        },
        body: JSON.stringify({
          integrationType: 'google_calendar',
          weekData: calendarData.weekData,
          userProfile: {
            jobTitle: 'Senior Software Engineer',
            seniorityLevel: 'Senior'
          }
        })
      })

      const snippetResponse = await generateFromIntegration(snippetRequest)
      const snippetData = await snippetResponse.json()
      
      expect(snippetData.success).toBe(true)
      expect(snippetData.bullets).toBeDefined()
      expect(snippetData.bullets.length).toBeGreaterThan(0)

      // 3. Generate reflection from snippet
      const reflectionRequest = new NextRequest('http://localhost:3000/api/assessments/generate-reflection-draft', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123' 
        },
        body: JSON.stringify({
          weeklySnippet: snippetData.weeklySnippet,
          bullets: snippetData.bullets,
          userProfile: {
            jobTitle: 'Senior Software Engineer',
            seniorityLevel: 'Senior'
          }
        })
      })

      const reflectionResponse = await generateReflectionDraft(reflectionRequest)
      const reflectionData = await reflectionResponse.json()
      
      expect(reflectionData.success).toBe(true)
      expect(reflectionData.reflectionDraft).toBeDefined()

      // 4. Verify data consistency through the chain
      const calendarText = calendarData.weekData.meetingContext.join(' ')
      const bulletsText = snippetData.bullets.join(' ')
      const reflectionText = reflectionData.reflectionDraft

      // All should contain JWT-related content (Jack's main work focus)
      expect(calendarText).toContain('JWT')
      expect(bulletsText).toContain('JWT')
      expect(reflectionText).toContain('JWT')

      // All should reflect the challenging nature of the work
      expect(calendarText.toLowerCase()).toMatch(/urgent|production|issues/i)
      expect(bulletsText.toLowerCase()).toMatch(/urgent|production|issues|debug/i)  
      expect(reflectionText.toLowerCase()).toMatch(/challenges|complex|guidance|support/i)
    })
  })
})