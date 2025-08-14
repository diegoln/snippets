/**
 * Jest Configuration for Integration Tests
 * 
 * Specialized configuration for running integration tests that require
 * database connections, longer timeouts, and real service interactions.
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Integration tests setup
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns for integration tests
  testMatch: [
    '**/__tests__/**/*.integration.{js,ts}',
    '**/__tests__/**/weekly-reflection-automation.test.ts'
  ],
  
  // Longer timeout for integration tests
  testTimeout: 300000, // 5 minutes
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/job-processor/handlers/weekly-reflection-handler.ts',
    'lib/schedulers/**/*.ts',
    'app/api/jobs/weekly-reflection/**/*.ts'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Environment variables for testing
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.integration.globalSetup.js',
  globalTeardown: '<rootDir>/jest.integration.globalTeardown.js',
  
  // Verbose output for debugging
  verbose: true,
  
  // Fail fast - stop on first test failure
  bail: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)