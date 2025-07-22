/**
 * Date utilities for calculating proper calendar week numbers
 */

/**
 * Get ISO week number for a given date
 * ISO week starts on Monday and week 1 contains January 4th
 */
export function getISOWeekNumber(date: Date): number {
  // Create a copy to avoid mutating the original date
  const d = new Date(date.getTime())
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  
  return weekNo
}

/**
 * Get the Monday of a given ISO week in a year
 */
export function getMondayOfISOWeek(year: number, week: number): Date {
  // January 4th is always in week 1
  const jan4 = new Date(year, 0, 4)
  
  // Find Monday of week 1
  const monday = new Date(jan4.getTime())
  monday.setDate(jan4.getDate() - (jan4.getDay() === 0 ? 6 : jan4.getDay() - 1))
  
  // Add weeks to get to the target week
  monday.setDate(monday.getDate() + (week - 1) * 7)
  
  return monday
}

/**
 * Get the Friday of a given ISO week in a year
 */
export function getFridayOfISOWeek(year: number, week: number): Date {
  const monday = getMondayOfISOWeek(year, week)
  const friday = new Date(monday.getTime())
  friday.setDate(monday.getDate() + 4)
  return friday
}

/**
 * Get current ISO week number
 */
export function getCurrentWeekNumber(): number {
  return getISOWeekNumber(new Date())
}

/**
 * Format date as "Jul 22, 2024" 
 */
export function formatDateWithYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',  
    year: 'numeric'
  })
}

/**
 * Format date range as "Jul 22, 2024 - Jul 26, 2024"
 */
export function formatDateRangeWithYear(startDate: Date, endDate: Date): string {
  const start = formatDateWithYear(startDate)
  const end = formatDateWithYear(endDate)
  
  // If same year, don't repeat the year in the start date
  if (startDate.getFullYear() === endDate.getFullYear()) {
    const startWithoutYear = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    return `${startWithoutYear} - ${end}`
  }
  
  return `${start} - ${end}`
}

/**
 * Generate realistic week numbers for the past 6 months
 * Starting from current week and going backwards
 */
export function generatePast6MonthsWeeks(): Array<{
  weekNumber: number
  year: number
  startDate: Date
  endDate: Date
}> {
  const currentWeek = getCurrentWeekNumber()
  const currentYear = new Date().getFullYear()
  const weeks = []
  
  // Generate 26 weeks going backwards from current week
  for (let i = 0; i < 26; i++) {
    let weekNum = currentWeek - i
    let year = currentYear
    
    // Handle year boundary crossing
    if (weekNum <= 0) {
      year = currentYear - 1
      // Get the number of weeks in the previous year
      const lastWeekOfPrevYear = getISOWeekNumber(new Date(year, 11, 31))
      weekNum = lastWeekOfPrevYear + weekNum
    }
    
    const startDate = getMondayOfISOWeek(year, weekNum)
    const endDate = getFridayOfISOWeek(year, weekNum)
    
    weeks.push({
      weekNumber: weekNum,
      year,
      startDate,
      endDate
    })
  }
  
  return weeks
}