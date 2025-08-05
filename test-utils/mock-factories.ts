/**
 * Mock Data Factories for API Tests
 * 
 * This module provides factory functions to generate consistent mock data
 * for API tests, improving maintainability and reducing duplication.
 */

export interface MockSnippetData {
  id: string
  weekNumber: number
  year: number
  startDate: Date
  endDate: Date
  content: string
  extractedTasks: string | null
  extractedMeetings: string | null
  aiSuggestions: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MockUserProfileData {
  id: string
  email: string
  name: string | null
  jobTitle: string | null
  seniorityLevel: string | null
  performanceFeedback: string | null
  onboardingCompletedAt: Date | null
}

export interface MockAssessmentData {
  id: string
  cycleName: string
  startDate: Date
  endDate: Date
  generatedDraft: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Factory function for creating mock snippet data
 */
export function createMockSnippet(overrides: Partial<MockSnippetData> = {}): MockSnippetData {
  const defaults: MockSnippetData = {
    id: 'snippet-test',
    weekNumber: 30,
    year: 2025,
    startDate: new Date('2025-07-21'),
    endDate: new Date('2025-07-25'),
    content: 'Test snippet content',
    extractedTasks: null,
    extractedMeetings: null,
    aiSuggestions: null,
    createdAt: new Date('2025-07-21T10:00:00Z'),
    updatedAt: new Date('2025-07-21T10:00:00Z')
  }
  
  return { ...defaults, ...overrides }
}

/**
 * Factory function for creating multiple mock snippets in chronological order
 */
export function createMockSnippets(count: number, startWeek: number = 30): MockSnippetData[] {
  return Array.from({ length: count }, (_, index) => {
    const weekNumber = startWeek - index
    const startDate = new Date('2025-07-21')
    startDate.setDate(startDate.getDate() - (index * 7))
    
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 4)
    
    return createMockSnippet({
      id: `snippet-${weekNumber}`,
      weekNumber,
      startDate,
      endDate,
      content: `Week ${weekNumber} content`,
      createdAt: new Date(startDate),
      updatedAt: new Date(startDate)
    })
  })
}

/**
 * Factory function for creating mock user profile data
 */
export function createMockUserProfile(overrides: Partial<MockUserProfileData> = {}): MockUserProfileData {
  const defaults: MockUserProfileData = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    jobTitle: 'engineer',
    seniorityLevel: 'senior',
    performanceFeedback: null,
    onboardingCompletedAt: new Date('2025-01-01T10:00:00.000Z')
  }
  
  return { ...defaults, ...overrides }
}

/**
 * Factory function for creating mock assessment data
 */
export function createMockAssessment(overrides: Partial<MockAssessmentData> = {}): MockAssessmentData {
  const defaults: MockAssessmentData = {
    id: 'assessment-test',
    cycleName: 'Q1 2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    generatedDraft: 'Generated assessment draft content',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z')
  }
  
  return { ...defaults, ...overrides }
}

/**
 * Factory for creating mock data service with pre-configured responses
 */
export function createMockDataService(config: {
  snippets?: MockSnippetData[]
  userProfile?: MockUserProfileData | null
  assessments?: MockAssessmentData[]
} = {}) {
  return {
    getSnippets: jest.fn().mockResolvedValue(config.snippets || []),
    createSnippet: jest.fn(),
    updateSnippet: jest.fn(),
    deleteSnippet: jest.fn(),
    getUserProfile: jest.fn().mockResolvedValue(config.userProfile || null),
    updateUserProfile: jest.fn(),
    getAssessments: jest.fn().mockResolvedValue(config.assessments || []),
    createAssessment: jest.fn(),
    getIntegrations: jest.fn().mockResolvedValue([]),
    createIntegration: jest.fn(),
    deleteIntegration: jest.fn(),
    upsertIntegration: jest.fn(),
    getSnippetsInDateRange: jest.fn().mockResolvedValue([]),
    disconnect: jest.fn()
  }
}

/**
 * Common test data sets for different scenarios
 */
export const testData = {
  // Common snippet data for reverse chronological order tests
  snippetsInDescOrder: createMockSnippets(3, 30),
  
  // Empty user profile for 404 tests
  emptyUserProfile: null,
  
  // Standard user profile for success tests
  standardUserProfile: createMockUserProfile(),
  
  // User profile with custom fields
  customUserProfile: createMockUserProfile({
    jobTitle: 'Custom Role',
    seniorityLevel: 'Principal Architect'
  }),
  
  // Standard assessment
  standardAssessment: createMockAssessment()
}