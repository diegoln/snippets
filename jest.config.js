/**
 * Jest Configuration for Weekly Snippets Reminder
 * 
 * This configuration sets up Jest for testing both React components
 * and Node.js server code with TypeScript support.
 */

/** @type {import('jest').Config} */
const jestConfig = {
  // Use node environment to avoid JSDOM issues
  testEnvironment: 'node',
  
  // JSDOM configuration to fix window issues
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  
  // Setup files to run after tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,ts}',
    '<rootDir>/lib/__tests__/**/*.{js,ts}',
    '<rootDir>/app/api/**/*.test.{js,ts}',
    '<rootDir>/app/api/**/__tests__/**/*.{js,ts}'
  ],

  // Exclude problematic test files
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/integration-reset-onboarding-e2e.test.ts'
  ],
  
  // Module paths and aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js',
    '!next.config.js',
    '!tailwind.config.js',
    '!postcss.config.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Transform configuration for TypeScript and JavaScript
  // Babel is used ONLY for Jest tests, Next.js uses SWC for faster compilation
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-typescript']
      ]
    }]
  },
  
  // Transform ignore patterns - allow transformation of ESM modules
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|next-auth|@next-auth))',
    '^.+\\.module\\.(css|sass|scss)$'
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true
}

module.exports = jestConfig