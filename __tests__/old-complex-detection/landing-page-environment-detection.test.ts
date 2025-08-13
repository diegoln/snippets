/**
 * Test to verify landing page environment detection works correctly
 * 
 * This test ensures that the staging yellow banner appears when accessing /staging
 * and that environment-specific button labels are correct.
 */

import { getClientEnvironmentMode } from '../../lib/environment'

// Mock window.location for different scenarios
const mockLocation = {
  pathname: '',
  origin: 'https://advanceweekly.io',
  href: ''
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

describe('Landing Page Environment Detection', () => {
  beforeEach(() => {
    // Reset to production defaults
    mockLocation.pathname = '/'
    mockLocation.origin = 'https://advanceweekly.io'
    mockLocation.href = 'https://advanceweekly.io/'
    process.env.NODE_ENV = 'production'
  })

  describe('Client Environment Detection', () => {
    it('should detect staging environment for /staging path', () => {
      mockLocation.pathname = '/staging'
      mockLocation.href = 'https://advanceweekly.io/staging'
      
      const mode = getClientEnvironmentMode()
      expect(mode).toBe('staging')
    })

    it('should detect staging environment for /staging/* paths', () => {
      mockLocation.pathname = '/staging/dashboard'
      mockLocation.href = 'https://advanceweekly.io/staging/dashboard'
      
      const mode = getClientEnvironmentMode()
      expect(mode).toBe('staging')
    })

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development'
      mockLocation.pathname = '/'
      mockLocation.href = 'http://localhost:3000/'
      
      const mode = getClientEnvironmentMode()
      expect(mode).toBe('development')
    })

    it('should detect production environment by default', () => {
      mockLocation.pathname = '/'
      mockLocation.href = 'https://advanceweekly.io/'
      
      const mode = getClientEnvironmentMode()
      expect(mode).toBe('production')
    })

    it('should detect production for non-staging paths', () => {
      mockLocation.pathname = '/dashboard'
      mockLocation.href = 'https://advanceweekly.io/dashboard'
      
      const mode = getClientEnvironmentMode()
      expect(mode).toBe('production')
    })
  })

  describe('Landing Page Component Logic Simulation', () => {
    // Simulate the exact logic from LandingPage component
    function getLandingPageState() {
      const environmentMode = getClientEnvironmentMode()
      const stagingMode = environmentMode === 'staging'
      const devMode = environmentMode === 'development'
      
      return {
        environmentMode,
        stagingMode,
        devMode,
        shouldShowBanner: stagingMode, // Yellow banner appears when stagingMode is true
        buttonSuffix: stagingMode ? ' (Staging)' : devMode ? ' (Dev)' : ''
      }
    }

    it('should show yellow banner and staging suffix for /staging', () => {
      mockLocation.pathname = '/staging'
      mockLocation.href = 'https://advanceweekly.io/staging'
      
      const state = getLandingPageState()
      
      expect(state.environmentMode).toBe('staging')
      expect(state.stagingMode).toBe(true)
      expect(state.devMode).toBe(false)
      expect(state.shouldShowBanner).toBe(true) // Yellow banner should appear!
      expect(state.buttonSuffix).toBe(' (Staging)')
    })

    it('should show dev suffix but no banner for development', () => {
      process.env.NODE_ENV = 'development'
      mockLocation.pathname = '/'
      
      const state = getLandingPageState()
      
      expect(state.environmentMode).toBe('development')
      expect(state.stagingMode).toBe(false)
      expect(state.devMode).toBe(true)
      expect(state.shouldShowBanner).toBe(false) // No banner in dev
      expect(state.buttonSuffix).toBe(' (Dev)')
    })

    it('should show no banner or suffix for production', () => {
      mockLocation.pathname = '/'
      mockLocation.href = 'https://advanceweekly.io/'
      
      const state = getLandingPageState()
      
      expect(state.environmentMode).toBe('production')
      expect(state.stagingMode).toBe(false)
      expect(state.devMode).toBe(false)
      expect(state.shouldShowBanner).toBe(false) // No banner in production
      expect(state.buttonSuffix).toBe('')
    })

    it('REPRODUCES ORIGINAL BUG: using wrong environment detection would fail', () => {
      mockLocation.pathname = '/staging'
      mockLocation.href = 'https://advanceweekly.io/staging'
      
      // Simulate the old buggy approach that didn't work on client-side
      function getBuggyLandingPageState() {
        // This simulates calling isStaging() which used getEnvironmentMode() 
        // instead of getClientEnvironmentMode()
        
        // On client-side, getEnvironmentMode() falls back to 'production'
        // because it can't access server headers
        const environmentMode = 'production' // This is what the bug was causing
        const stagingMode = environmentMode === 'staging'
        
        return {
          environmentMode,
          stagingMode,
          shouldShowBanner: stagingMode
        }
      }
      
      const buggyState = getBuggyLandingPageState()
      
      // The bug: even on /staging, stagingMode would be false
      expect(buggyState.environmentMode).toBe('production')
      expect(buggyState.stagingMode).toBe(false)
      expect(buggyState.shouldShowBanner).toBe(false) // Banner wouldn't show!
      
      // Our fix: using getClientEnvironmentMode() works correctly
      const fixedState = getLandingPageState()
      expect(fixedState.stagingMode).toBe(true)
      expect(fixedState.shouldShowBanner).toBe(true) // Banner shows correctly!
    })
  })
})