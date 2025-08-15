/**
 * Hook for managing reflection automation preferences
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  ReflectionPreferences, 
  ReflectionPreferencesUpdate,
  DEFAULT_REFLECTION_PREFERENCES 
} from '../types/reflection-preferences'

interface UseReflectionPreferencesReturn {
  preferences: ReflectionPreferences | null
  availableIntegrations: string[]
  isLoading: boolean
  error: string | null
  updatePreferences: (updates: ReflectionPreferencesUpdate) => Promise<void>
  refreshPreferences: () => Promise<void>
}

export function useReflectionPreferences(): UseReflectionPreferencesReturn {
  const [preferences, setPreferences] = useState<ReflectionPreferences | null>(null)
  const [availableIntegrations, setAvailableIntegrations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch preferences from API
   */
  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/user/reflection-preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch preferences')
      }

      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.preferences || DEFAULT_REFLECTION_PREFERENCES)
        setAvailableIntegrations(data.availableIntegrations || [])
      } else {
        throw new Error(data.error || 'Failed to fetch preferences')
      }
    } catch (err) {
      console.error('Error fetching reflection preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences')
      // Set default preferences as fallback
      setPreferences(DEFAULT_REFLECTION_PREFERENCES)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Update preferences via API
   */
  const updatePreferences = useCallback(async (updates: ReflectionPreferencesUpdate) => {
    try {
      setError(null)

      const response = await fetch('/api/user/reflection-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update preferences')
      }

      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.preferences)
      } else {
        throw new Error(data.error || 'Failed to update preferences')
      }
    } catch (err) {
      console.error('Error updating reflection preferences:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      setError(errorMessage)
      throw new Error(errorMessage) // Re-throw so component can handle it
    }
  }, [])

  /**
   * Refresh preferences (useful for external updates)
   */
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences()
  }, [fetchPreferences])

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    availableIntegrations,
    isLoading,
    error,
    updatePreferences,
    refreshPreferences
  }
}