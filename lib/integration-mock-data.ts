/**
 * Mock integration data for development and staging environments
 * This file provides sample data to demonstrate the onboarding flow
 * 
 * PRODUCTION SAFETY: This data is never exposed in production builds
 */

import { shouldUseMockIntegrations } from './environment'

// Ensure this module only works in dev-like environments
if (!shouldUseMockIntegrations() && typeof window === 'undefined') {
  // Only throw on server-side in production (client-side may need this for types)
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
 * DEVELOPMENT & STAGING ONLY - Returns empty array in production
 */
export function getMockIntegrationBullets(integrationType: string): string[] {
  // Double-check environment safety
  if (!shouldUseMockIntegrations()) {
    console.error('CRITICAL: Mock data accessed in production - this should never happen')
    return []
  }

  return MOCK_INTEGRATION_BULLETS[integrationType] || []
}

/**
 * Enhanced mock data for staging environment with more variety
 */
const STAGING_SPECIFIC_BULLETS: Record<string, string[]> = {
  google_calendar: [
    '[STAGING] Technical deep dive on authentication improvements',
    '[STAGING] Cross-team collaboration on API design standards',
    '[STAGING] Performance optimization workshop for database queries',
    '[STAGING] Incident response training and runbook updates',
  ],
  github: [
    '[STAGING] Refactored caching layer improving response time by 60%',
    '[STAGING] Implemented feature flags for gradual rollout capability',
    '[STAGING] Debugged complex race condition in payment processing',
    '[STAGING] Consolidated legacy API endpoints for better maintainability',
  ],
  todoist: [
    '[STAGING] Planned technical debt reduction for authentication service',
    '[STAGING] Researched and documented migration path to new framework',
    '[STAGING] Created performance benchmarks for critical user journeys',
    '[STAGING] Organized knowledge sharing session on security best practices',
  ]
}

/**
 * Get environment-specific mock integration data
 */
export function getEnvironmentMockBullets(integrationType: string, includeStaging = false): string[] {
  if (!shouldUseMockIntegrations()) {
    return []
  }
  
  const baseBullets = MOCK_INTEGRATION_BULLETS[integrationType] || []
  
  if (includeStaging) {
    const stagingBullets = STAGING_SPECIFIC_BULLETS[integrationType] || []
    return [...baseBullets, ...stagingBullets]
  }
  
  return baseBullets
}