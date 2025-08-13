/**
 * Tests for Simplified Environment Detection
 * 
 * Replaces ~40 complex environment detection tests with simple NODE_ENV testing.
 * 
 * With dedicated staging infrastructure (staging.advanceweekly.io), 
 * environment detection is now straightforward and reliable.
 */

// Mock process.env for testing
const originalNodeEnv = process.env.NODE_ENV

describe('Simplified Environment Detection', () => {
  beforeEach(() => {
    // Clear any cached modules
    jest.resetModules()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('Environment Mode Detection', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development'
      const { getEnvironmentMode } = require('../lib/environment')
      
      expect(getEnvironmentMode()).toBe('development')
    })

    it('should detect staging environment', () => {
      process.env.NODE_ENV = 'staging'
      const { getEnvironmentMode } = require('../lib/environment')
      
      expect(getEnvironmentMode()).toBe('staging')
    })

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production'
      const { getEnvironmentMode } = require('../lib/environment')
      
      expect(getEnvironmentMode()).toBe('production')
    })

    it('should default to production for unknown NODE_ENV', () => {
      process.env.NODE_ENV = 'unknown'
      const { getEnvironmentMode } = require('../lib/environment')
      
      expect(getEnvironmentMode()).toBe('production')
    })
  })

  describe('Client Environment Detection', () => {
    it('should work the same as server detection', () => {
      process.env.NODE_ENV = 'staging'
      const { getClientEnvironmentMode } = require('../lib/environment')
      
      expect(getClientEnvironmentMode()).toBe('staging')
    })
  })

  describe('Environment Checks', () => {
    it('should identify development environment', () => {
      process.env.NODE_ENV = 'development'
      const { isDevelopment, isStaging, isProduction } = require('../lib/environment')
      
      expect(isDevelopment()).toBe(true)
      expect(isStaging()).toBe(false)
      expect(isProduction()).toBe(false)
    })

    it('should identify staging environment', () => {
      process.env.NODE_ENV = 'staging'
      const { isDevelopment, isStaging, isProduction } = require('../lib/environment')
      
      expect(isDevelopment()).toBe(false)
      expect(isStaging()).toBe(true)
      expect(isProduction()).toBe(false)
    })

    it('should identify production environment', () => {
      process.env.NODE_ENV = 'production'
      const { isDevelopment, isStaging, isProduction } = require('../lib/environment')
      
      expect(isDevelopment()).toBe(false)
      expect(isStaging()).toBe(false)
      expect(isProduction()).toBe(true)
    })
  })

  describe('Dev-like Environment Detection', () => {
    it('should consider development as dev-like', () => {
      process.env.NODE_ENV = 'development'
      const { isDevLike } = require('../lib/environment')
      
      expect(isDevLike()).toBe(true)
    })

    it('should consider staging as dev-like', () => {
      process.env.NODE_ENV = 'staging'
      const { isDevLike } = require('../lib/environment')
      
      expect(isDevLike()).toBe(true)
    })

    it('should not consider production as dev-like', () => {
      process.env.NODE_ENV = 'production'
      const { isDevLike } = require('../lib/environment')
      
      expect(isDevLike()).toBe(false)
    })
  })

  describe('Base URL Generation', () => {
    it('should return localhost for development', () => {
      process.env.NODE_ENV = 'development'
      const { getBaseUrl } = require('../lib/environment')
      
      const baseUrl = getBaseUrl()
      expect(baseUrl).toMatch(/localhost/)
    })

    it('should return staging subdomain for staging', () => {
      process.env.NODE_ENV = 'staging'
      const { getBaseUrl } = require('../lib/environment')
      
      expect(getBaseUrl()).toBe('https://staging.advanceweekly.io')
    })

    it('should return production domain for production', () => {
      process.env.NODE_ENV = 'production'
      const { getBaseUrl } = require('../lib/environment')
      
      expect(getBaseUrl()).toBe('https://advanceweekly.io')
    })
  })

  describe('Environment Configuration', () => {
    it('should provide correct config for staging', () => {
      process.env.NODE_ENV = 'staging'
      const { getEnvironmentConfig } = require('../lib/environment')
      
      const config = getEnvironmentConfig()
      expect(config.database).toBe('postgresql')
      expect(config.auth).toBe('mock')  // Staging uses mock auth
      expect(config.integrations).toBe('mock')
      expect(config.devTools).toBe(true)
    })

    it('should provide correct config for production', () => {
      process.env.NODE_ENV = 'production'
      const { getEnvironmentConfig } = require('../lib/environment')
      
      const config = getEnvironmentConfig()
      expect(config.database).toBe('postgresql')
      expect(config.auth).toBe('oauth')  // Production uses real OAuth
      expect(config.integrations).toBe('real')
      expect(config.devTools).toBe(false)
    })
  })

  describe('Feature Flags', () => {
    it('should enable mock auth in dev-like environments', () => {
      process.env.NODE_ENV = 'staging'
      const { shouldUseMockAuth } = require('../lib/environment')
      
      expect(shouldUseMockAuth()).toBe(true)
    })

    it('should disable mock auth in production', () => {
      process.env.NODE_ENV = 'production'
      const { shouldUseMockAuth } = require('../lib/environment')
      
      expect(shouldUseMockAuth()).toBe(false)
    })
  })
})

describe('Staging Environment Validation', () => {
  it('should confirm staging uses dedicated infrastructure', () => {
    process.env.NODE_ENV = 'staging'
    const { getEnvironmentInfo } = require('../lib/environment')
    
    const info = getEnvironmentInfo()
    
    expect(info.mode).toBe('staging')
    expect(info.baseUrl).toBe('https://staging.advanceweekly.io')
    expect(info.config.auth).toBe('mock')
    expect(info.isDevLike).toBe(true)
    expect(info.displayName).toBe('Staging')
  })
})