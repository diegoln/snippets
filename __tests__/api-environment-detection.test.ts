/**
 * Test to reproduce and verify the API environment detection issue
 * 
 * This test confirms why the mock users API returns 403 when called from staging.
 */

import { getApiEnvironmentMode } from '../lib/api-environment'
import { NextRequest } from 'next/server'

describe('API Environment Detection Issue', () => {
  function createMockRequest(options: {
    url: string
    referrer?: string
    headers?: Record<string, string>
  }) {
    const request = new NextRequest(options.url)
    
    // Set referrer if provided
    if (options.referrer) {
      request.headers.set('referer', options.referrer)
    }
    
    // Set additional headers if provided
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        request.headers.set(key, value)
      })
    }
    
    return request
  }

  beforeEach(() => {
    // Set to production environment to simulate the actual issue
    process.env.NODE_ENV = 'production'
  })

  it('REPRODUCES BUG: API call from staging page fails environment detection', () => {
    // SCENARIO: User is on /staging page, JavaScript makes fetch request to API
    // This simulates exactly what happens in the browser
    
    const request = createMockRequest({
      url: 'https://advanceweekly.io/api/auth/mock-users', // API endpoint URL
      referrer: 'https://advanceweekly.io/staging' // Should indicate staging context
    })
    
    const mode = getApiEnvironmentMode(request)
    
    // THE BUG: Should detect staging but detects production instead
    console.log('URL pathname:', request.nextUrl.pathname)
    console.log('Referrer:', request.headers.get('referer'))
    console.log('x-environment-mode header:', request.headers.get('x-environment-mode'))
    console.log('Detected mode:', mode)
    
    // This test reproduces the 403 error
    if (mode === 'production') {
      console.log('❌ API would return 403 - Mock users API accessed in production environment')
    }
    
    // After our fix: environment detection should work correctly
    expect(mode).toBe('staging') // This is what it should be
  })

  it('SHOULD WORK: Referrer-based detection with /staging', () => {
    const request = createMockRequest({
      url: 'https://advanceweekly.io/api/auth/mock-users',
      referrer: 'https://advanceweekly.io/staging'
    })
    
    const mode = getApiEnvironmentMode(request)
    
    // This should work with referrer detection
    expect(mode).toBe('staging')
  })

  it('SHOULD WORK: Header-based detection from middleware', () => {
    const request = createMockRequest({
      url: 'https://advanceweekly.io/api/auth/mock-users',
      headers: {
        'x-environment-mode': 'staging'
      }
    })
    
    const mode = getApiEnvironmentMode(request)
    
    expect(mode).toBe('staging')
  })

  it('SHOULD WORK: Explicit staging request header from client', () => {
    const request = createMockRequest({
      url: 'https://advanceweekly.io/api/auth/mock-users',
      headers: {
        'x-staging-request': 'true'
      }
    })
    
    const mode = getApiEnvironmentMode(request)
    
    expect(mode).toBe('staging')
  })

  it('CONTROL: Production API call should detect production', () => {
    const request = createMockRequest({
      url: 'https://advanceweekly.io/api/auth/mock-users',
      referrer: 'https://advanceweekly.io/'
    })
    
    const mode = getApiEnvironmentMode(request)
    
    expect(mode).toBe('production')
  })

  describe('Edge Cases', () => {
    it('should handle missing referrer', () => {
      const request = createMockRequest({
        url: 'https://advanceweekly.io/api/auth/mock-users'
        // No referrer
      })
      
      const mode = getApiEnvironmentMode(request)
      
      expect(mode).toBe('production') // Default fallback
    })

    it('should handle staging subdirectory in referrer', () => {
      const request = createMockRequest({
        url: 'https://advanceweekly.io/api/auth/mock-users',
        referrer: 'https://advanceweekly.io/staging/dashboard'
      })
      
      const mode = getApiEnvironmentMode(request)
      
      expect(mode).toBe('staging')
    })
  })
})