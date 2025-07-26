/**
 * Week calculation utilities
 * 
 * Centralized logic for calculating week numbers to ensure consistency
 * across frontend, API, and data service layers.
 */

/**
 * Calculate the current week number based on the given date
 * Uses ISO week numbering where week starts on Monday
 * 
 * @param date - The date to calculate week number for (defaults to current date)
 * @returns Week number (1-53)
 */
export function getCurrentWeekNumber(date: Date = new Date()): number {
  const year = date.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const daysSinceStartOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7)
}

/**
 * Check if a given week number is in the future relative to current date
 * 
 * @param weekNumber - Week number to check
 * @param currentDate - Current date reference (defaults to now)
 * @returns true if week is in the future, false otherwise
 */
export function isWeekInFuture(weekNumber: number, currentDate: Date = new Date()): boolean {
  const currentWeek = getCurrentWeekNumber(currentDate)
  return weekNumber > currentWeek
}

/**
 * Validate that a week number is valid (positive integer within reasonable bounds)
 * 
 * @param weekNumber - Week number to validate
 * @returns true if valid, false otherwise
 */
export function isValidWeekNumber(weekNumber: number): boolean {
  return Number.isInteger(weekNumber) && weekNumber >= 1 && weekNumber <= 53
}