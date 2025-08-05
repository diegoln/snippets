/**
 * API Test Setup - Shared mocking utilities for API route tests
 * 
 * This module provides common mocking setup for API tests to ensure consistent
 * behavior and prevent mock conflicts between test suites.
 */

// Global setup for API tests
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
  
  // Reset module registry to prevent mock pollution
  jest.resetModules()
})

// Mock NextAuth JWT for consistent test behavior
export const mockNextAuthJWT = {
  getToken: jest.fn()
}

// Mock Prisma client factory
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    weeklySnippet: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn()
    },
    performanceAssessment: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    session: {
      findUnique: jest.fn()
    },
    integration: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn()
    },
    $disconnect: jest.fn()
  }
}

// Mock user data service factory
export function createMockUserDataService() {
  return {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    getSnippets: jest.fn(),
    getSnippetsInDateRange: jest.fn(),
    createSnippet: jest.fn(),
    updateSnippet: jest.fn(),
    deleteSnippet: jest.fn(),
    getAssessments: jest.fn(),
    createAssessment: jest.fn(),
    getIntegrations: jest.fn(),
    createIntegration: jest.fn(),
    deleteIntegration: jest.fn(),
    upsertIntegration: jest.fn(),
    disconnect: jest.fn()
  }
}

// Export test utilities
export const testUtils = {
  createMockRequest: (url: string, options: RequestInit = {}) => {
    return new Request(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        ...options.headers
      },
      ...options
    }) as any // Type assertion for NextRequest compatibility
  },
  
  mockAuthenticatedUser: (userId: string = 'test-user-123') => {
    mockNextAuthJWT.getToken.mockResolvedValue({
      sub: userId,
      email: 'test@example.com',
      name: 'Test User'
    })
  },
  
  mockUnauthenticatedUser: () => {
    mockNextAuthJWT.getToken.mockResolvedValue(null)
  }
}