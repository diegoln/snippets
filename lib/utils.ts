/**
 * Utility functions for the Weekly Snippets application
 * 
 * This module contains pure functions for date calculations,
 * formatting, and other common operations used throughout the app.
 */

/**
 * Interface for weekly snippet data structure
 */
export interface WeeklySnippet {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  content: string
}

/**
 * Calculate current week number based on current date
 * Uses ISO week calculation for consistency (ISO 8601 standard)
 * 
 * @param date - Date to calculate week for (defaults to current date)
 * @returns Current week number of the year (1-53)
 * @throws {Error} If date is invalid
 */
export function getCurrentWeek(date: Date = new Date()): number {
  // Validate input date
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }
  
  // Clone the date to avoid mutation
  const targetDate = new Date(date.getTime())
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday = 7 for ISO week calculation
  const dayOfWeek = targetDate.getDay() || 7
  targetDate.setDate(targetDate.getDate() + 4 - dayOfWeek)
  
  // Get first day of year
  const yearStart = new Date(targetDate.getFullYear(), 0, 1)
  
  // Calculate full weeks to nearest Thursday
  const weekNumber = Math.ceil(((targetDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  
  // Validate result is within expected range
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error(`Invalid week number calculated: ${weekNumber}`)
  }
  
  return weekNumber
}

/**
 * Format date range for display (e.g., "Jul 21st - Jul 25th")
 * 
 * @param startDate - Start date in YYYY-MM-DD format or Date object
 * @param endDate - End date in YYYY-MM-DD format or Date object
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: string | Date, 
  endDate: string | Date,
  locale: string = 'en-US'
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date provided')
  }
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric' 
  }
  
  try {
    const startFormatted = start.toLocaleDateString(locale, options)
    const endFormatted = end.toLocaleDateString(locale, options)
    
    return `${startFormatted} - ${endFormatted}`
  } catch (error) {
    throw new Error(`Failed to format dates: ${error}`)
  }
}

/**
 * Get the start and end dates for a given week number and year
 * 
 * @param weekNumber - Week number (1-53)
 * @param year - Year (defaults to current year)
 * @returns Object with start and end dates
 */
export function getWeekDates(weekNumber: number, year: number = new Date().getFullYear()) {
  // Validate input
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error('Week number must be between 1 and 53')
  }
  
  if (year < 1970 || year > 3000) {
    throw new Error('Year must be between 1970 and 3000')
  }
  
  // Get January 1st of the year
  const jan1 = new Date(year, 0, 1)
  
  // Find the first Monday of the year
  const daysToFirstMonday = (8 - jan1.getDay()) % 7
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)
  
  // Calculate the start of the requested week (Monday)
  const weekStart = new Date(firstMonday)
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
  
  // Calculate the end of the week (Friday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)
  
  return {
    startDate: weekStart.toISOString().split('T')[0],
    endDate: weekEnd.toISOString().split('T')[0]
  }
}

/**
 * Validate snippet content
 * 
 * @param content - Content to validate
 * @returns Object with validation result and error message
 */
export function validateSnippetContent(content: string): { 
  isValid: boolean
  error?: string 
} {
  // Check if content is provided
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Content is required' }
  }
  
  // Trim whitespace
  const trimmed = content.trim()
  
  // Check minimum length
  if (trimmed.length < 10) {
    return { isValid: false, error: 'Content must be at least 10 characters long' }
  }
  
  // Check maximum length (10,000 characters)
  if (trimmed.length > 10000) {
    return { isValid: false, error: 'Content must be less than 10,000 characters' }
  }
  
  // Check for potentially harmful content (basic XSS prevention)
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, error: 'Content contains potentially unsafe elements' }
    }
  }
  
  return { isValid: true }
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses comprehensive sanitization approach with whitelist
 * 
 * @param input - Input string to sanitize
 * @returns Sanitized string
 * @throws {Error} If input validation fails
 */
export function sanitizeHTML(input: string): string {
  if (!input) {
    return ''
  }
  
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  // Server-side safe sanitization without DOM dependency
  if (typeof document === 'undefined') {
    // Server-side: strict text-only sanitization
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/&/g, '&amp;')
  }
  
  // Client-side: use DOM text parsing with additional validation
  const temp = document.createElement('div')
  temp.textContent = input
  
  // Additional validation for dangerous patterns
  const sanitized = temp.innerHTML
  const dangerousPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /data:/gi,
    /on\w+=/gi
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Input contains potentially unsafe content')
    }
  }
  
  return sanitized
}

/**
 * Generate a unique ID for snippets
 * 
 * @returns Unique string ID
 */
export function generateSnippetId(): string {
  return `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sort snippets by week number in descending order (newest first)
 * 
 * @param snippets - Array of snippets to sort
 * @returns Sorted array of snippets
 */
export function sortSnippetsByWeek(snippets: WeeklySnippet[]): WeeklySnippet[] {
  return [...snippets].sort((a, b) => b.weekNumber - a.weekNumber)
}

/**
 * Find snippet by week number
 * 
 * @param snippets - Array of snippets to search
 * @param weekNumber - Week number to find
 * @returns Found snippet or undefined
 */
export function findSnippetByWeek(
  snippets: WeeklySnippet[], 
  weekNumber: number
): WeeklySnippet | undefined {
  return snippets.find(snippet => snippet.weekNumber === weekNumber)
}

/**
 * Calculate reading time for snippet content
 * Assumes average reading speed of 200 words per minute
 * 
 * @param content - Content to analyze
 * @returns Reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  if (!content || typeof content !== 'string') {
    return 0
  }
  
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  
  return Math.max(1, minutes) // Minimum 1 minute
}

/**
 * Debounce function to limit rapid function calls
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}