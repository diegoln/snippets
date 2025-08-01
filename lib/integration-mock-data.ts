/**
 * Mock integration data for development environment
 * This file should not be included in production builds
 */

// Mock bullets based on integration type
export const MOCK_INTEGRATION_BULLETS: Record<string, string[]> = {
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
 * Only works in development environment
 */
export function getMockIntegrationBullets(integrationType: string): string[] {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Mock integration data requested in production environment')
    return []
  }

  return MOCK_INTEGRATION_BULLETS[integrationType] || []
}