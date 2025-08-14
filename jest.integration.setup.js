/**
 * Jest Integration Test Setup
 * 
 * Sets up the test environment for integration tests including
 * database connections, mock services, and test utilities.
 */

const { PrismaClient } = require('@prisma/client')
const { spawn } = require('child_process')

// Global test database client
global.testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
    }
  }
})

// Mocks are now defined in the test file itself

// Setup test environment
beforeAll(async () => {
  // Ensure database is ready
  try {
    await global.testPrisma.$connect()
    console.log('✅ Test database connected')
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error)
    throw error
  }
})

// Cleanup after all tests
afterAll(async () => {
  await global.testPrisma.$disconnect()
  console.log('✅ Test database disconnected')
})

// Utility functions for tests
global.testHelpers = {
  createTestUser: async (overrides = {}) => {
    return await global.testPrisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        jobTitle: 'Software Engineer',
        seniorityLevel: 'Senior',
        careerProgressionPlan: 'Focus on technical leadership',
        onboardingCompletedAt: new Date(),
        ...overrides
      }
    })
  },
  
  createTestAccount: async (userId, overrides = {}) => {
    return await global.testPrisma.account.create({
      data: {
        userId,
        type: 'oauth',
        provider: 'google',
        providerAccountId: `google-${Date.now()}`,
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        ...overrides
      }
    })
  },
  
  cleanupTestUser: async (userId) => {
    await global.testPrisma.asyncOperation.deleteMany({ where: { userId } })
    await global.testPrisma.weeklySnippet.deleteMany({ where: { userId } })
    await global.testPrisma.integrationConsolidation.deleteMany({ where: { userId } })
    await global.testPrisma.account.deleteMany({ where: { userId } })
    await global.testPrisma.user.delete({ where: { id: userId } })
  }
}

// Console output helpers
const originalConsoleLog = console.log
const originalConsoleError = console.error

console.log = (...args) => {
  if (process.env.VERBOSE_TESTS === 'true') {
    originalConsoleLog(...args)
  }
}

console.error = (...args) => {
  // Always show errors
  originalConsoleError(...args)
}

// Restore original console methods for cleanup
global.restoreConsole = () => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
}