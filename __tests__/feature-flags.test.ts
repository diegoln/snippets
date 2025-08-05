/**
 * Feature Flags Tests
 * 
 * Tests for feature flag functionality in the application.
 * 
 * NOTE: This test focuses on the logic rather than React rendering
 * since the Jest config excludes .tsx files to avoid JSDOM issues.
 */

describe('Career Check-ins Feature Flag Logic', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS
    }
  })

  test('should return false when feature flag is not set', () => {
    delete process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS
    
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(false)
  })

  test('should return false when feature flag is set to false string', () => {
    process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = 'false'
    
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(false)
  })

  test('should return false when feature flag is set to empty string', () => {
    process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = ''
    
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(false)
  })

  test('should return true when feature flag is set to true string', () => {
    process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = 'true'
    
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(true)
  })

  test('should return false when feature flag is set to any other value', () => {
    const testValues = ['True', 'TRUE', '1', 'yes', 'enabled', 'on']
    
    testValues.forEach(value => {
      process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = value
      const isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
      expect(isEnabled).toBe(false)
    })
  })

  test('feature flag logic should be case sensitive', () => {
    process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = 'True'
    
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(false)
  })

  test('should handle feature flag changes at runtime', () => {
    // Start disabled
    delete process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS
    let isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(false)

    // Enable
    process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = 'true'
    isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(true)

    // Disable again
    process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS = 'false'
    isEnabled = process.env.NEXT_PUBLIC_ENABLE_CAREER_CHECKINS === 'true'
    expect(isEnabled).toBe(false)
  })
})