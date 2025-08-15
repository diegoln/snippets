/**
 * Types for Reflection Automation Preferences
 */

export type ReflectionDay = 'monday' | 'friday' | 'sunday'

export interface ReflectionPreferences {
  autoGenerate: boolean
  preferredDay: ReflectionDay
  preferredHour: number // 0-23 in user's timezone
  timezone: string
  includeIntegrations: string[]
  notifyOnGeneration: boolean
}

export interface ReflectionPreferencesUpdate {
  autoGenerate?: boolean
  preferredDay?: ReflectionDay
  preferredHour?: number
  timezone?: string
  includeIntegrations?: string[]
  notifyOnGeneration?: boolean
}

export interface ReflectionPreferencesResponse {
  success: boolean
  preferences?: ReflectionPreferences
  error?: string
}

export const REFLECTION_DAYS: Array<{ value: ReflectionDay; label: string }> = [
  { value: 'monday', label: 'Monday' },
  { value: 'friday', label: 'Friday' },
  { value: 'sunday', label: 'Sunday' }
]

export const DEFAULT_REFLECTION_PREFERENCES: ReflectionPreferences = {
  autoGenerate: true,
  preferredDay: 'friday',
  preferredHour: 14, // 2 PM
  timezone: 'America/New_York',
  includeIntegrations: [],
  notifyOnGeneration: false
}

/**
 * Validation functions
 */
export function isValidReflectionDay(day: string): day is ReflectionDay {
  return ['monday', 'friday', 'sunday'].includes(day)
}

export function isValidHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}