/**
 * Common timezone options for reflection preferences
 */

export interface TimezoneOption {
  value: string
  label: string
  offset: string
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
  
  // Europe
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Rome', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Madrid', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Amsterdam', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Stockholm', label: 'Central European Time (CET)', offset: 'UTC+1/+2' },
  { value: 'Europe/Helsinki', label: 'Eastern European Time (EET)', offset: 'UTC+2/+3' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)', offset: 'UTC+3' },
  
  // Asia Pacific
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 'UTC+9' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)', offset: 'UTC+9' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)', offset: 'UTC+8' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)', offset: 'UTC+8' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: 'UTC+5:30' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: 'UTC+10/+11' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (AET)', offset: 'UTC+10/+11' },
  { value: 'Australia/Perth', label: 'Australian Western Time (AWT)', offset: 'UTC+8' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'Brasília Time (BRT)', offset: 'UTC-3/-2' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina Time (ART)', offset: 'UTC-3' },
  { value: 'America/Santiago', label: 'Chile Standard Time (CLT)', offset: 'UTC-4/-3' },
  
  // Middle East & Africa
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: 'UTC+4' },
  { value: 'Asia/Riyadh', label: 'Arabia Standard Time (AST)', offset: 'UTC+3' },
  { value: 'Africa/Cairo', label: 'Eastern European Time (EET)', offset: 'UTC+2' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST)', offset: 'UTC+2' },
]

/**
 * Get user's detected timezone
 */
export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York' // Fallback
  }
}

/**
 * Format timezone for display
 */
export function formatTimezoneDisplay(timezone: string): string {
  const option = COMMON_TIMEZONES.find(tz => tz.value === timezone)
  return option ? `${option.label} (${option.offset})` : timezone
}

/**
 * Search timezones by name
 */
export function searchTimezones(query: string): TimezoneOption[] {
  const lowerQuery = query.toLowerCase()
  return COMMON_TIMEZONES.filter(tz => 
    tz.label.toLowerCase().includes(lowerQuery) || 
    tz.value.toLowerCase().includes(lowerQuery)
  )
}