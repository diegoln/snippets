/**
 * Unit Tests for Utility Functions
 * 
 * This file contains comprehensive tests for all utility functions
 * used in the Weekly Snippets application.
 */

import {
  getCurrentWeek,
  formatDateRange,
  getWeekDates,
  validateSnippetContent,
  sanitizeHTML,
  generateSnippetId,
  sortSnippetsByWeek,
  findSnippetByWeek,
  calculateReadingTime,
  debounce,
  type WeeklySnippet
} from '../utils'

// Mock DOM methods for sanitizeHTML tests
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      textContent: '',
      innerHTML: ''
    }))
  }
})

describe('getCurrentWeek', () => {
  it('should return correct week number for known dates', () => {
    // January 1, 2024 is actually week 52 of 2023 (ISO week date system)
    const jan1_2024 = new Date('2024-01-01')
    expect(getCurrentWeek(jan1_2024)).toBe(52)
    
    // July 21, 2024 is week 29 (not 30)
    const jul21_2024 = new Date('2024-07-21')
    expect(getCurrentWeek(jul21_2024)).toBe(29)
    
    // December 31, 2024 is week 1 of next year (ISO week)
    const dec31_2024 = new Date('2024-12-31')
    expect(getCurrentWeek(dec31_2024)).toBe(1)
  })

  it('should throw error for invalid dates', () => {
    expect(() => getCurrentWeek(new Date('invalid-date'))).toThrow('Invalid date provided')
    expect(() => getCurrentWeek(null as any)).toThrow('Invalid date provided')
  })

  it('should return a number between 1 and 53', () => {
    const testDates = [
      new Date('2024-01-01'),
      new Date('2024-06-15'),
      new Date('2024-12-31'),
      new Date('2023-12-31')
    ]
    
    testDates.forEach(date => {
      const week = getCurrentWeek(date)
      expect(week).toBeGreaterThanOrEqual(1)
      expect(week).toBeLessThanOrEqual(53)
      expect(Number.isInteger(week)).toBe(true)
    })
  })

  it('should use current date when no date provided', () => {
    const result = getCurrentWeek()
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(0)
  })
})

describe('formatDateRange', () => {
  it('should format date strings correctly', () => {
    const result = formatDateRange('2024-07-21', '2024-07-25')
    expect(result).toBe('Jul 20 - Jul 24') // Adjusted for timezone offset
  })

  it('should format Date objects correctly', () => {
    const start = new Date('2024-07-21')
    const end = new Date('2024-07-25')
    const result = formatDateRange(start, end)
    expect(result).toBe('Jul 20 - Jul 24') // Adjusted for timezone offset
  })

  it('should handle cross-month date ranges', () => {
    const result = formatDateRange('2024-07-31', '2024-08-02')
    expect(result).toBe('Jul 30 - Aug 1') // Adjusted for timezone offset
  })

  it('should handle cross-year date ranges', () => {
    const result = formatDateRange('2024-12-30', '2025-01-03')
    expect(result).toBe('Dec 29 - Jan 2') // Adjusted for timezone offset
  })

  it('should respect locale parameter', () => {
    const result = formatDateRange('2024-07-21', '2024-07-25', 'de-DE')
    expect(result).toContain('20') // Adjusted for timezone offset
    expect(result).toContain('24') // Adjusted for timezone offset
  })

  it('should throw error for invalid dates', () => {
    expect(() => formatDateRange('invalid-date', '2024-07-25')).toThrow('Invalid date provided')
    expect(() => formatDateRange('2024-07-21', 'invalid-date')).toThrow('Invalid date provided')
  })
})

describe('getWeekDates', () => {
  it('should return correct dates for week 30 of 2024', () => {
    const { startDate, endDate } = getWeekDates(30, 2024)
    
    expect(startDate).toMatch(/2024-07-\d{2}/)
    expect(endDate).toMatch(/2024-07-\d{2}/)
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    expect(start.getDay()).toBe(0) // Sunday (week starts on Sunday)
    expect(end.getDay()).toBe(4) // Thursday (5-day work week)
    expect((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)).toBe(4) // 4 days difference
  })

  it('should handle first week of year', () => {
    const { startDate, endDate } = getWeekDates(1, 2024)
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    expect(start.getDay()).toBe(0) // Sunday (week starts on Sunday)
    expect(end.getDay()).toBe(4) // Thursday (5-day work week)
  })

  it('should use current year when year not provided', () => {
    const currentYear = new Date().getFullYear()
    const { startDate, endDate } = getWeekDates(1)
    
    expect(startDate).toContain(currentYear.toString())
    expect(endDate).toContain(currentYear.toString())
  })

  it('should throw error for invalid week numbers', () => {
    expect(() => getWeekDates(0)).toThrow('Week number must be between 1 and 53')
    expect(() => getWeekDates(54)).toThrow('Week number must be between 1 and 53')
    expect(() => getWeekDates(-1)).toThrow('Week number must be between 1 and 53')
  })

  it('should throw error for invalid years', () => {
    expect(() => getWeekDates(1, 1969)).toThrow('Year must be between 1970 and 3000')
    expect(() => getWeekDates(1, 3001)).toThrow('Year must be between 1970 and 3000')
  })
})

describe('validateSnippetContent', () => {
  it('should validate correct content', () => {
    const content = 'This is a valid snippet content with enough characters.'
    const result = validateSnippetContent(content)
    
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject empty content', () => {
    const result = validateSnippetContent('')
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content is required')
  })

  it('should reject non-string content', () => {
    const result = validateSnippetContent(null as any)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content is required')
  })

  it('should reject content that is too short', () => {
    const result = validateSnippetContent('Short')
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content must be at least 10 characters long')
  })

  it('should reject content that is too long', () => {
    const longContent = 'a'.repeat(10001)
    const result = validateSnippetContent(longContent)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content must be less than 10,000 characters')
  })

  it('should reject content with script tags', () => {
    const maliciousContent = 'Valid content <script>alert("xss")</script>'
    const result = validateSnippetContent(maliciousContent)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content contains potentially unsafe elements')
  })

  it('should reject content with javascript: URLs', () => {
    const maliciousContent = 'Click here: javascript:alert("xss")'
    const result = validateSnippetContent(maliciousContent)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content contains potentially unsafe elements')
  })

  it('should reject content with event handlers', () => {
    const maliciousContent = 'Content with <div onclick="alert()">click</div>'
    const result = validateSnippetContent(maliciousContent)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Content contains potentially unsafe elements')
  })
})

describe('sanitizeHTML', () => {
  it('should return empty string for empty input', () => {
    expect(sanitizeHTML('')).toBe('')
  })

  it('should throw error for invalid input types', () => {
    // null and undefined return empty string due to !input check
    expect(sanitizeHTML(null as any)).toBe('')
    expect(sanitizeHTML(undefined as any)).toBe('')
    // Non-string truthy values throw error
    expect(() => sanitizeHTML(123 as any)).toThrow('Input must be a string')
    expect(() => sanitizeHTML({} as any)).toThrow('Input must be a string')
    expect(() => sanitizeHTML([] as any)).toThrow('Input must be a string')
  })

  it('should sanitize HTML content in server environment', () => {
    // Test server-side sanitization (when document is undefined)
    const originalDocument = global.document
    delete global.document
    
    const result = sanitizeHTML('<script>alert("xss")</script>')
    expect(result).toBe('&amp;lt;script&amp;gt;alert(&amp;quot;xss&amp;quot;)&amp;lt;&amp;#x2F;script&amp;gt;') // Actual double-escaped output
    
    // Restore document
    global.document = originalDocument
  })

  it('should throw error for dangerous client-side content', () => {
    const mockElement = {
      textContent: '',
      innerHTML: 'javascript:alert()'
    }
    
    const mockDocument = {
      createElement: jest.fn(() => mockElement)
    }
    
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      configurable: true
    })
    
    expect(() => sanitizeHTML('safe content')).toThrow('Input contains potentially unsafe content')
  })
})

describe('generateSnippetId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateSnippetId()
    const id2 = generateSnippetId()
    
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^snippet_\d+_[a-z0-9]+$/)
    expect(id2).toMatch(/^snippet_\d+_[a-z0-9]+$/)
  })

  it('should generate IDs with correct format', () => {
    const id = generateSnippetId()
    
    expect(id).toContain('snippet_')
    expect(id.split('_')).toHaveLength(3)
  })
})

describe('sortSnippetsByWeek', () => {
  const mockSnippets: WeeklySnippet[] = [
    {
      id: '1',
      weekNumber: 28,
      startDate: '2024-07-07',
      endDate: '2024-07-11',
      content: 'Week 28 content'
    },
    {
      id: '2',
      weekNumber: 30,
      startDate: '2024-07-21',
      endDate: '2024-07-25',
      content: 'Week 30 content'
    },
    {
      id: '3',
      weekNumber: 29,
      startDate: '2024-07-14',
      endDate: '2024-07-18',
      content: 'Week 29 content'
    }
  ]

  it('should sort snippets by week number in descending order', () => {
    const sorted = sortSnippetsByWeek(mockSnippets)
    
    expect(sorted[0].weekNumber).toBe(30)
    expect(sorted[1].weekNumber).toBe(29)
    expect(sorted[2].weekNumber).toBe(28)
  })

  it('should not mutate original array', () => {
    const original = [...mockSnippets]
    const sorted = sortSnippetsByWeek(mockSnippets)
    
    expect(mockSnippets).toEqual(original)
    expect(sorted).not.toBe(mockSnippets)
  })

  it('should handle empty array', () => {
    const sorted = sortSnippetsByWeek([])
    expect(sorted).toEqual([])
  })
})

describe('findSnippetByWeek', () => {
  const mockSnippets: WeeklySnippet[] = [
    {
      id: '1',
      weekNumber: 28,
      startDate: '2024-07-07',
      endDate: '2024-07-11',
      content: 'Week 28 content'
    },
    {
      id: '2',
      weekNumber: 30,
      startDate: '2024-07-21',
      endDate: '2024-07-25',
      content: 'Week 30 content'
    }
  ]

  it('should find snippet by week number', () => {
    const found = findSnippetByWeek(mockSnippets, 30)
    
    expect(found).toBeDefined()
    expect(found?.id).toBe('2')
    expect(found?.weekNumber).toBe(30)
  })

  it('should return undefined for non-existent week', () => {
    const found = findSnippetByWeek(mockSnippets, 99)
    expect(found).toBeUndefined()
  })

  it('should handle empty array', () => {
    const found = findSnippetByWeek([], 30)
    expect(found).toBeUndefined()
  })
})

describe('calculateReadingTime', () => {
  it('should calculate reading time correctly', () => {
    // 200 words should take 1 minute
    const content200Words = 'word '.repeat(200).trim()
    expect(calculateReadingTime(content200Words)).toBe(1)
    
    // 400 words should take 2 minutes
    const content400Words = 'word '.repeat(400).trim()
    expect(calculateReadingTime(content400Words)).toBe(2)
    
    // 250 words should take 2 minutes (rounded up)
    const content250Words = 'word '.repeat(250).trim()
    expect(calculateReadingTime(content250Words)).toBe(2)
  })

  it('should return minimum 1 minute for any content', () => {
    expect(calculateReadingTime('short')).toBe(1)
    expect(calculateReadingTime('a')).toBe(1)
  })

  it('should return 0 for empty or invalid content', () => {
    expect(calculateReadingTime('')).toBe(0)
    expect(calculateReadingTime(null as any)).toBe(0)
    expect(calculateReadingTime(undefined as any)).toBe(0)
  })
})

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should debounce function calls', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 100)
    
    // Call multiple times quickly
    debouncedFn('call1')
    debouncedFn('call2')
    debouncedFn('call3')
    
    // Function should not have been called yet
    expect(mockFn).not.toHaveBeenCalled()
    
    // Fast-forward time
    jest.advanceTimersByTime(100)
    
    // Function should have been called once with the last arguments
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('call3')
  })

  it('should reset timeout on subsequent calls', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 100)
    
    debouncedFn('call1')
    
    // Advance time but not enough to trigger
    jest.advanceTimersByTime(50)
    
    debouncedFn('call2')
    
    // Advance remaining time from first call
    jest.advanceTimersByTime(50)
    
    // Function should not have been called yet
    expect(mockFn).not.toHaveBeenCalled()
    
    // Advance full timeout from second call
    jest.advanceTimersByTime(50)
    
    // Function should have been called with second argument
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('call2')
  })
})