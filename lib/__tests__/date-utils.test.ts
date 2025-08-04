/**
 * Unit tests for date utility functions
 * Tests ISO week number calculations and date formatting
 */

import {
  getISOWeekNumber,
  getMondayOfISOWeek,
  getFridayOfISOWeek,
  getCurrentWeekNumber,
  formatDateWithYear,
  formatDateRangeWithYear,
  generatePast6MonthsWeeks
} from '../date-utils'

describe('date-utils', () => {
  describe('getISOWeekNumber', () => {
    it('should return correct ISO week numbers for known dates', () => {
      // Known ISO week dates for testing
      expect(getISOWeekNumber(new Date('2025-01-01'))).toBe(1) // January 1, 2025 is week 1
      expect(getISOWeekNumber(new Date('2025-07-21'))).toBe(30) // July 21, 2025 is week 30
      expect(getISOWeekNumber(new Date('2025-12-22'))).toBe(52) // December 22, 2025 is week 52 (last week of 2025)
    })

    it('should handle year boundaries correctly', () => {
      // Test dates around year boundaries
      expect(getISOWeekNumber(new Date('2024-12-30'))).toBe(1) // This belongs to week 1 of 2025
      expect(getISOWeekNumber(new Date('2025-01-05'))).toBe(1) // Definitely week 1 of 2025
    })

    it('should be consistent with Monday-based weeks', () => {
      // ISO weeks start on Monday
      const monday = new Date('2025-07-21') // Monday
      const sunday = new Date('2025-07-27') // Sunday of same week
      expect(getISOWeekNumber(monday)).toBe(getISOWeekNumber(sunday))
    })
  })

  describe('getMondayOfISOWeek', () => {
    it('should return correct Monday for given week', () => {
      const monday = getMondayOfISOWeek(2025, 30)
      expect(monday.getFullYear()).toBe(2025)
      expect(monday.getMonth()).toBe(6) // July is month 6 (0-indexed)
      expect(monday.getDate()).toBe(21) // July 21, 2025 is Monday of week 30
      expect(monday.getDay()).toBe(1) // Monday is day 1
    })

    it('should handle week 1 correctly', () => {
      const monday = getMondayOfISOWeek(2025, 1)
      expect(monday.getFullYear()).toBe(2024)
      expect(monday.getMonth()).toBe(11) // December
      expect(monday.getDate()).toBe(30) // December 30, 2024 is Monday of week 1 2025
    })
  })

  describe('getFridayOfISOWeek', () => {
    it('should return correct Friday for given week', () => {
      const friday = getFridayOfISOWeek(2025, 30)
      expect(friday.getFullYear()).toBe(2025)
      expect(friday.getMonth()).toBe(6) // July is month 6 (0-indexed)
      expect(friday.getDate()).toBe(25) // July 25, 2025 is Friday of week 30
      expect(friday.getDay()).toBe(5) // Friday is day 5
    })

    it('should be 4 days after Monday of same week', () => {
      const monday = getMondayOfISOWeek(2025, 15)
      const friday = getFridayOfISOWeek(2025, 15)
      const diffInDays = (friday.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffInDays).toBe(4)
    })
  })

  describe('getCurrentWeekNumber', () => {
    it('should return a valid week number', () => {
      const currentWeek = getCurrentWeekNumber()
      expect(currentWeek).toBeGreaterThan(0)
      expect(currentWeek).toBeLessThanOrEqual(53)
    })

    it('should match getISOWeekNumber for current date', () => {
      const currentWeek = getCurrentWeekNumber()
      const todayWeek = getISOWeekNumber(new Date())
      expect(currentWeek).toBe(todayWeek)
    })
  })

  describe('formatDateWithYear', () => {
    it('should format date with year correctly', () => {
      const date = new Date(2025, 6, 21) // July 21, 2025 in local time
      const formatted = formatDateWithYear(date)
      expect(formatted).toBe('Jul 21, 2025')
    })

    it('should handle different months', () => {
      expect(formatDateWithYear(new Date(2025, 0, 15))).toBe('Jan 15, 2025') // January 15
      expect(formatDateWithYear(new Date(2025, 11, 31))).toBe('Dec 31, 2025') // December 31
    })
  })

  describe('formatDateRangeWithYear', () => {
    it('should format same-year range correctly', () => {
      const start = new Date(2025, 6, 21) // July 21, 2025
      const end = new Date(2025, 6, 25) // July 25, 2025
      const formatted = formatDateRangeWithYear(start, end)
      expect(formatted).toBe('Jul 21 - Jul 25, 2025')
    })

    it('should format cross-year range correctly', () => {
      const start = new Date(2024, 11, 30) // December 30, 2024
      const end = new Date(2025, 0, 3) // January 3, 2025
      const formatted = formatDateRangeWithYear(start, end)
      expect(formatted).toBe('Dec 30, 2024 - Jan 3, 2025')
    })

    it('should handle same date range', () => {
      const date = new Date(2025, 6, 21) // July 21, 2025
      const formatted = formatDateRangeWithYear(date, date)
      expect(formatted).toBe('Jul 21 - Jul 21, 2025')
    })
  })

  describe('generatePast6MonthsWeeks', () => {
    beforeEach(() => {
      // Mock current date to be predictable for testing
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-07-21')) // Week 30
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should generate 26 weeks of data', () => {
      const weeks = generatePast6MonthsWeeks()
      expect(weeks).toHaveLength(26)
    })

    it('should start with current week and go backwards', () => {
      const weeks = generatePast6MonthsWeeks()
      expect(weeks[0].weekNumber).toBe(30) // Current week
      expect(weeks[1].weekNumber).toBe(29) // Previous week
      expect(weeks[2].weekNumber).toBe(28) // Week before that
    })

    it('should handle year boundary crossing', () => {
      // Mock a date that would cross year boundaries when going back 26 weeks
      jest.setSystemTime(new Date('2025-02-15')) // Week 7 of 2025
      
      const weeks = generatePast6MonthsWeeks()
      // Going back 26 weeks from week 7 should include weeks from 2024
      const years = [...new Set(weeks.map(w => w.year))]
      expect(years).toContain(2024)
      expect(years).toContain(2025)
      
      // Reset back to July for other tests
      jest.setSystemTime(new Date('2025-07-21'))
    })

    it('should have Monday to Friday date ranges', () => {
      const weeks = generatePast6MonthsWeeks()
      weeks.forEach(week => {
        expect(week.startDate.getDay()).toBe(1) // Monday
        expect(week.endDate.getDay()).toBe(5) // Friday
        
        // End date should be 4 days after start date
        const diffInDays = (week.endDate.getTime() - week.startDate.getTime()) / (1000 * 60 * 60 * 24)
        expect(diffInDays).toBe(4)
      })
    })

    it('should generate consecutive week numbers', () => {
      const weeks = generatePast6MonthsWeeks()
      for (let i = 0; i < weeks.length - 1; i++) {
        const currentWeek = weeks[i]
        const nextWeek = weeks[i + 1]
        
        // Should be consecutive (handling year boundaries)
        if (currentWeek.year === nextWeek.year) {
          expect(currentWeek.weekNumber - 1).toBe(nextWeek.weekNumber)
        }
      }
    })

    it('should maintain correct week-to-date mapping', () => {
      const weeks = generatePast6MonthsWeeks()
      weeks.forEach(week => {
        // Verify that the week number matches what getISOWeekNumber would return
        const calculatedWeek = getISOWeekNumber(week.startDate)
        expect(week.weekNumber).toBe(calculatedWeek)
      })
    })
  })
})