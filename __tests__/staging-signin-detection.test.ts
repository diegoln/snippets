/**
 * Test to reproduce and verify the staging detection issue
 * 
 * This test confirms the hypothesis that when users access /staging,
 * they get redirected to /auth/signin but the staging context is lost,
 * causing them to be routed to Google OAuth instead of mock signin.
 * 
 * This is a unit test of the staging detection logic rather than a full React test.
 */

describe('Staging Detection Logic Issue', () => {
  // Simulate the staging detection logic from the signin page
  function detectStagingContext(options: {
    callbackUrl: string
    referrer: string
    currentPath: string
    currentOrigin: string
    currentHref: string
  }) {
    const { callbackUrl, referrer, currentPath, currentOrigin, currentHref } = options
    
    // This is the exact logic from the signin page (updated)
    const decodedCallbackUrl = decodeURIComponent(callbackUrl)
    const callbackHasStaging = callbackUrl.includes('/staging') || decodedCallbackUrl.includes('/staging')
    const referrerHasStaging = referrer.includes('/staging') 
    const pathHasStaging = currentPath.startsWith('/staging')
    const originHasStaging = currentOrigin.includes('staging')
    const urlHasStaging = currentHref.includes('/staging')
    
    const isStaging = callbackHasStaging || referrerHasStaging || pathHasStaging || originHasStaging || urlHasStaging
    
    return {
      isStaging,
      checks: {
        callbackHasStaging,
        referrerHasStaging,
        pathHasStaging,
        originHasStaging,
        urlHasStaging
      },
      stagingTrigger: callbackHasStaging ? 'callbackUrl' : 
                      referrerHasStaging ? 'referrer' :
                      pathHasStaging ? 'path' : 
                      originHasStaging ? 'origin' : 
                      urlHasStaging ? 'url' : 'none'
    }
  }

  it('REPRODUCES BUG: /staging redirect loses staging context completely', () => {
    // SCENARIO: User navigates to /staging, gets redirected to /auth/signin
    // All staging context is lost - this is the bug we're seeing in production
    
    const result = detectStagingContext({
      callbackUrl: '/', // Lost the staging part!
      referrer: '', // No referrer
      currentPath: '/auth/signin', // Rewritten by middleware
      currentOrigin: 'https://advanceweekly.io', // Production domain
      currentHref: 'https://advanceweekly.io/auth/signin' // No staging context
    })
    
    // THE BUG: No staging context detected at all
    expect(result.isStaging).toBe(false)
    expect(result.stagingTrigger).toBe('none')
    expect(result.checks).toEqual({
      callbackHasStaging: false,
      referrerHasStaging: false,
      pathHasStaging: false,
      originHasStaging: false,
      urlHasStaging: false
    })
    
    // This would cause Google OAuth to be triggered instead of mock signin
  })

  it('WORKS: NextAuth preserves staging in callbackUrl (ideal case)', () => {
    // SCENARIO: NextAuth correctly preserves the staging path in callbackUrl
    
    const result = detectStagingContext({
      callbackUrl: '/staging', // NextAuth preserved this
      referrer: '',
      currentPath: '/auth/signin',
      currentOrigin: 'https://advanceweekly.io',
      currentHref: 'https://advanceweekly.io/auth/signin?callbackUrl=%2Fstaging'
    })
    
    // This should work correctly
    expect(result.isStaging).toBe(true)
    expect(result.stagingTrigger).toBe('callbackUrl')
  })

  it('WORKS: Referrer contains staging context', () => {
    // SCENARIO: User came from a staging page, referrer should contain staging
    
    const result = detectStagingContext({
      callbackUrl: '/',
      referrer: 'https://advanceweekly.io/staging',
      currentPath: '/auth/signin',
      currentOrigin: 'https://advanceweekly.io',
      currentHref: 'https://advanceweekly.io/auth/signin'
    })
    
    expect(result.isStaging).toBe(true)
    expect(result.stagingTrigger).toBe('referrer')
  })

  it('SHOULD WORK: Current URL contains staging (our fix)', () => {
    // SCENARIO: If middleware doesn't completely rewrite the URL, we can detect staging
    
    const result = detectStagingContext({
      callbackUrl: '/',
      referrer: '',
      currentPath: '/staging/auth/signin', // Middleware didn't rewrite this
      currentOrigin: 'https://advanceweekly.io',
      currentHref: 'https://advanceweekly.io/staging/auth/signin'
    })
    
    // Our fix should catch this
    expect(result.isStaging).toBe(true)
    expect(result.stagingTrigger).toBe('path')
  })

  it('SHOULD WORK: URL-based detection as last resort', () => {
    // SCENARIO: Even if path is rewritten, full URL might still contain staging
    
    const result = detectStagingContext({
      callbackUrl: '/',
      referrer: '',
      currentPath: '/auth/signin', // Rewritten
      currentOrigin: 'https://advanceweekly.io',
      currentHref: 'https://advanceweekly.io/staging/auth/signin' // But URL still has it
    })
    
    expect(result.isStaging).toBe(true)
    expect(result.stagingTrigger).toBe('url')
  })

  it('CONTROL: Production signin should not detect staging', () => {
    // SCENARIO: Normal production sign-in flow
    
    const result = detectStagingContext({
      callbackUrl: '/',
      referrer: 'https://advanceweekly.io',
      currentPath: '/auth/signin',
      currentOrigin: 'https://advanceweekly.io',
      currentHref: 'https://advanceweekly.io/auth/signin'
    })
    
    expect(result.isStaging).toBe(false)
    expect(result.stagingTrigger).toBe('none')
  })

  describe('Edge Cases and Robustness', () => {
    it('should handle encoded URLs in callbackUrl', () => {
      const result = detectStagingContext({
        callbackUrl: '%2Fstaging', // URL encoded staging
        referrer: '',
        currentPath: '/auth/signin',
        currentOrigin: 'https://advanceweekly.io',
        currentHref: 'https://advanceweekly.io/auth/signin?callbackUrl=%2Fstaging'
      })
      
      expect(result.isStaging).toBe(true)
      expect(result.stagingTrigger).toBe('callbackUrl')
    })

    it('should handle staging subdomain', () => {
      const result = detectStagingContext({
        callbackUrl: '/',
        referrer: '',
        currentPath: '/auth/signin',
        currentOrigin: 'https://staging.advanceweekly.io',
        currentHref: 'https://staging.advanceweekly.io/auth/signin'
      })
      
      expect(result.isStaging).toBe(true)
      expect(result.stagingTrigger).toBe('origin')
    })

    it('should handle multiple staging indicators (prioritize callbackUrl)', () => {
      const result = detectStagingContext({
        callbackUrl: '/staging',
        referrer: 'https://advanceweekly.io/staging/dashboard',
        currentPath: '/staging/auth/signin',
        currentOrigin: 'https://advanceweekly.io',
        currentHref: 'https://advanceweekly.io/staging/auth/signin'
      })
      
      expect(result.isStaging).toBe(true)
      expect(result.stagingTrigger).toBe('callbackUrl') // Should prioritize callbackUrl
    })
  })
})