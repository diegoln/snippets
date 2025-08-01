/**
 * Mock integration data for development environment ONLY
 * This file provides sample data to demonstrate the onboarding flow
 * 
 * PRODUCTION SAFETY: This data is never exposed in production builds
 */

// Ensure this module only works in development
if (process.env.NODE_ENV === 'production') {
  throw new Error('Mock integration data should not be imported in production')
}

// Mock bullets based on integration type
const MOCK_INTEGRATION_BULLETS: Record<string, string[]> = {
  google_calendar: [
    'Led architecture review meeting for new microservice design',
    'Conducted 3 technical interviews for senior engineering positions',
    'Presented Q4 roadmap to executive team',
    'Mentored junior developers in weekly 1:1 sessions',
  ],
  github: [
    'Merged 12 PRs including critical auth service refactor',
    'Reviewed 28 pull requests across 3 repositories',
    'Implemented new CI/CD pipeline reducing deploy time by 40%',
    'Fixed critical production bug affecting 10k users',
  ],
  jira: [
    'Completed 8 story points in sprint 42',
    'Resolved 3 high-priority bugs in payment system',
    'Delivered user profile feature ahead of schedule',
    'Created technical design docs for upcoming epic',
  ],
}

/**
 * Get mock bullets for an integration type
 * DEVELOPMENT ONLY - Returns empty array in production
 */
export function getMockIntegrationBullets(integrationType: string): string[] {
  // Double-check environment safety
  if (process.env.NODE_ENV !== 'development') {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Mock data accessed in production - this should never happen')
    }
    return []
  }

  return MOCK_INTEGRATION_BULLETS[integrationType] || []
}