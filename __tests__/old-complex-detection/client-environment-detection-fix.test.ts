/**
 * Test to verify the client environment detection fix for mock-signin page
 */

// Mock window.location
const mockLocation = {
  pathname: '',
  search: '',
  href: '',
  hash: ''
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock process.env.NODE_ENV
const originalNodeEnv = process.env.NODE_ENV

describe('Client Environment Detection Fix', () => {
  beforeEach(() => {
    // Reset location mock
    mockLocation.pathname = ''
    mockLocation.search = ''
    mockLocation.href = ''
    mockLocation.hash = ''
    process.env.NODE_ENV = 'production' // Simulate production build
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should detect staging from callback URL on mock-signin page', () => {
    // REPRODUCES USER SCENARIO: Clicked button on /staging landing page
    mockLocation.pathname = '/mock-signin'
    mockLocation.search = '?callbackUrl=%2Fstaging'
    mockLocation.href = 'https://advanceweekly.io/mock-signin?callbackUrl=%2Fstaging'

    // Import after setting up mocks
    const { getClientEnvironmentMode } = require('../../lib/environment-old')
    
    const result = getClientEnvironmentMode()
    
    expect(result).toBe('staging')
  })

  it('should detect staging from exact callback URL match', () => {
    mockLocation.pathname = '/mock-signin'
    mockLocation.search = '?callbackUrl=/staging'
    mockLocation.href = 'https://advanceweekly.io/mock-signin?callbackUrl=/staging'

    const { getClientEnvironmentMode } = require('../../lib/environment-old')
    
    const result = getClientEnvironmentMode()
    
    expect(result).toBe('staging')
  })

  it('should still detect staging from direct /staging paths', () => {
    mockLocation.pathname = '/staging'
    mockLocation.href = 'https://advanceweekly.io/staging'

    const { getClientEnvironmentMode } = require('../../lib/environment-old')
    
    const result = getClientEnvironmentMode()
    
    expect(result).toBe('staging')
  })

  it('should default to production for regular mock-signin without staging callback', () => {
    mockLocation.pathname = '/mock-signin'
    mockLocation.search = '?callbackUrl=%2F'
    mockLocation.href = 'https://advanceweekly.io/mock-signin?callbackUrl=%2F'

    const { getClientEnvironmentMode } = require('../../lib/environment-old')
    
    const result = getClientEnvironmentMode()
    
    expect(result).toBe('production')
  })

  it('should detect development when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development'
    mockLocation.pathname = '/mock-signin'
    mockLocation.href = 'http://localhost:3000/mock-signin'

    const { getClientEnvironmentMode } = require('../../lib/environment-old')
    
    const result = getClientEnvironmentMode()
    
    expect(result).toBe('development')
  })
})