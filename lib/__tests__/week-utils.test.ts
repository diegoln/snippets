/**
 * Unit tests for week utility functions
 * Tests week calculation logic and validation functions
 */

import { getCurrentWeekNumber, isWeekInFuture, isValidWeekNumber } from '../week-utils'

describe('Week Utils', () => {
  describe('getCurrentWeekNumber', () => {
    it('should calculate week number correctly for known dates', () => {
      // Week 2 of 2025 (January 5th, 2025 is actually week 2)
      const week1 = new Date('2025-01-05T10:00:00.000Z')
      expect(getCurrentWeekNumber(week1)).toBe(2)

      // Week 30 of 2025 (July 26th, 2025 is actually week 30)
      const week30 = new Date('2025-07-26T10:00:00.000Z')
      expect(getCurrentWeekNumber(week30)).toBe(30)

      // Last week of year (December 28, 2025 is a Sunday, so week 53)
      const week53 = new Date('2025-12-28T10:00:00.000Z')
      expect(getCurrentWeekNumber(week53)).toBe(53)
    })

    it('should handle year boundaries correctly', () => {
      // First day of year
      const jan1 = new Date('2025-01-01T10:00:00.000Z')
      expect(getCurrentWeekNumber(jan1)).toBe(1)

      // Last day of year
      const dec31 = new Date('2025-12-31T10:00:00.000Z')
      expect(getCurrentWeekNumber(dec31)).toBe(53)
    })

    it('should use current date when no date provided', () => {
      const result = getCurrentWeekNumber()
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(53)
    })
  })

  describe('isWeekInFuture', () => {
    it('should correctly identify future weeks', () => {
      const currentDate = new Date('2025-07-26T10:00:00.000Z') // Week 30
      
      expect(isWeekInFuture(31, 2025, currentDate)).toBe(true)  // Future
      expect(isWeekInFuture(30, 2025, currentDate)).toBe(false) // Current
      expect(isWeekInFuture(29, 2025, currentDate)).toBe(false) // Past
      expect(isWeekInFuture(52, 2025, currentDate)).toBe(true)  // Far future
    })

    it('should handle edge cases', () => {
      // First week of year
      const jan1 = new Date('2025-01-01T10:00:00.000Z')
      expect(isWeekInFuture(1, 2025, jan1)).toBe(false) // Current week
      expect(isWeekInFuture(2, 2025, jan1)).toBe(true)  // Next week

      // Last week of year
      const dec31 = new Date('2025-12-31T10:00:00.000Z')
      expect(isWeekInFuture(53, 2025, dec31)).toBe(false) // Current week
      expect(isWeekInFuture(52, 2025, dec31)).toBe(false) // Previous week
    })

    it('should use current date when no date provided', () => {
      // Test with obviously future week
      expect(isWeekInFuture(999)).toBe(true)
      
      // Test with obviously past week (assuming we're not in week 1)
      const now = new Date()
      if (getCurrentWeekNumber(now) > 1) {
        expect(isWeekInFuture(1)).toBe(false)
      }
    })
  })

  describe('isValidWeekNumber', () => {
    it('should accept valid week numbers', () => {
      expect(isValidWeekNumber(1)).toBe(true)
      expect(isValidWeekNumber(30)).toBe(true)
      expect(isValidWeekNumber(53)).toBe(true)
    })

    it('should reject invalid week numbers', () => {
      expect(isValidWeekNumber(0)).toBe(false)     // Too low
      expect(isValidWeekNumber(-1)).toBe(false)    // Negative
      expect(isValidWeekNumber(54)).toBe(false)    // Too high
      expect(isValidWeekNumber(999)).toBe(false)   // Way too high
    })

    it('should reject non-integers', () => {
      expect(isValidWeekNumber(1.5)).toBe(false)   // Decimal
      expect(isValidWeekNumber(NaN)).toBe(false)   // NaN
      expect(isValidWeekNumber(Infinity)).toBe(false) // Infinity
    })

    it('should handle type coercion correctly', () => {
      // These should all be false because they're not proper numbers
      expect(isValidWeekNumber('1' as any)).toBe(false)
      expect(isValidWeekNumber(null as any)).toBe(false)
      expect(isValidWeekNumber(undefined as any)).toBe(false)
    })
  })

  describe('integration between functions', () => {
    it('should have consistent behavior between getCurrentWeekNumber and isWeekInFuture', () => {
      const testDate = new Date('2025-07-26T10:00:00.000Z') // Week 30
      const currentWeek = getCurrentWeekNumber(testDate)
      
      // Current week should not be in future
      expect(isWeekInFuture(currentWeek, 2025, testDate)).toBe(false)
      
      // Next week should be in future
      expect(isWeekInFuture(currentWeek + 1, 2025, testDate)).toBe(true)
      
      // Previous week should not be in future
      if (currentWeek > 1) {
        expect(isWeekInFuture(currentWeek - 1, 2025, testDate)).toBe(false)
      }
    })
  })
})