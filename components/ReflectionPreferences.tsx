/**
 * Reflection Preferences Component
 * 
 * Allows users to configure their automated reflection generation preferences
 * including when reflections are generated and which integrations to include.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Tooltip } from './Tooltip'
import { 
  ReflectionPreferences,
  ReflectionPreferencesUpdate, 
  REFLECTION_DAYS,
  DEFAULT_REFLECTION_PREFERENCES,
  isValidHour,
  isValidTimezone
} from '../types/reflection-preferences'
import { COMMON_TIMEZONES, getDetectedTimezone, formatTimezoneDisplay } from '../constants/timezones'

interface ReflectionPreferencesProps {
  onSave: (preferences: ReflectionPreferencesUpdate) => Promise<void>
  onClose?: () => void
  initialPreferences?: Partial<ReflectionPreferences>
  availableIntegrations?: string[]
  isLoading?: boolean
}

interface ReflectionPreferencesErrors {
  preferredHour?: string
  timezone?: string
  general?: string
}

export function ReflectionPreferencesComponent({ 
  onSave,
  onClose, 
  initialPreferences = {}, 
  availableIntegrations = [],
  isLoading = false 
}: ReflectionPreferencesProps): JSX.Element {
  // Initialize preferences with defaults
  const [preferences, setPreferences] = useState<ReflectionPreferences>({
    ...DEFAULT_REFLECTION_PREFERENCES,
    timezone: getDetectedTimezone(), // Auto-detect user's timezone
    ...initialPreferences
  })
  
  const [errors, setErrors] = useState<ReflectionPreferencesErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Update preferences when initial data changes
  useEffect(() => {
    setPreferences(prev => ({
      ...prev,
      ...initialPreferences
    }))
  }, [initialPreferences])

  /**
   * Handle preference changes with validation
   */
  const handlePreferenceChange = useCallback((field: keyof ReflectionPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    setSaveSuccess(false) // Clear success state when user makes changes
    
    // Clear error when user makes changes
    if (errors[field as keyof ReflectionPreferencesErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  /**
   * Handle integration toggle
   */
  const handleIntegrationToggle = useCallback((integration: string, enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      includeIntegrations: enabled
        ? [...prev.includeIntegrations, integration]
        : prev.includeIntegrations.filter(i => i !== integration)
    }))
    setHasUnsavedChanges(true)
    setSaveSuccess(false) // Clear success state when user makes changes
  }, [])

  /**
   * Validate preferences
   */
  const validatePreferences = useCallback((): boolean => {
    const newErrors: ReflectionPreferencesErrors = {}

    // Validate hour
    if (!isValidHour(preferences.preferredHour)) {
      newErrors.preferredHour = 'Hour must be between 0 and 23'
    }

    // Validate timezone
    if (!isValidTimezone(preferences.timezone)) {
      newErrors.timezone = 'Invalid timezone'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [preferences])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validatePreferences()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    
    try {
      await onSave(preferences)
      setHasUnsavedChanges(false)
      setSaveSuccess(true)
      
      // Keep success state until user closes or makes changes
      // No auto-hide timeout to ensure "Done" button stays available
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to save preferences'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [preferences, validatePreferences, onSave])

  /**
   * Generate hour options for dropdown
   */
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour24 = i
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 < 12 ? 'AM' : 'PM'
    return {
      value: hour24,
      label: `${hour12}:00 ${ampm} (${hour24.toString().padStart(2, '0')}:00)`
    }
  })

  return (
    <div className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auto-generation Toggle */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={preferences.autoGenerate}
              onChange={(e) => handlePreferenceChange('autoGenerate', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading || isSubmitting}
            />
            Enable Automatic Reflection Generation
            <Tooltip content="When enabled, reflections will be automatically generated based on your schedule preferences.">
              <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </label>
          <p className="text-xs text-gray-500 ml-7">
            Automatically generate weekly reflections based on your integration data and schedule preferences.
          </p>
        </div>

        {/* Schedule Preferences */}
        {preferences.autoGenerate && (
          <div className="pl-6 border-l-2 border-blue-100 space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Schedule Preferences</h4>
            
            {/* Preferred Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Day
                <Tooltip content="Which day of the week to generate your reflection. Friday is recommended for end-of-week summaries.">
                  <svg className="w-4 h-4 ml-1 text-gray-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              <div className="space-y-2">
                {REFLECTION_DAYS.map(day => (
                  <label key={day.value} className="flex items-center">
                    <input
                      type="radio"
                      name="preferredDay"
                      value={day.value}
                      checked={preferences.preferredDay === day.value}
                      onChange={(e) => handlePreferenceChange('preferredDay', e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      disabled={isLoading || isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Hour */}
            <div>
              <label htmlFor="preferredHour" className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time
                <Tooltip content="What time of day to generate your reflection. Times are shown in your local timezone.">
                  <svg className="w-4 h-4 ml-1 text-gray-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              <select
                id="preferredHour"
                value={preferences.preferredHour}
                onChange={(e) => handlePreferenceChange('preferredHour', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.preferredHour ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading || isSubmitting}
              >
                {hourOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.preferredHour && (
                <p className="mt-1 text-sm text-red-600">{errors.preferredHour}</p>
              )}
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
                <Tooltip content="Your timezone for scheduling reflections. Auto-detected but can be changed.">
                  <svg className="w-4 h-4 ml-1 text-gray-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              <select
                id="timezone"
                value={preferences.timezone}
                onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.timezone ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading || isSubmitting}
              >
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset})
                  </option>
                ))}
              </select>
              {errors.timezone && (
                <p className="mt-1 text-sm text-red-600">{errors.timezone}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Current: {formatTimezoneDisplay(preferences.timezone)}
              </p>
            </div>
          </div>
        )}

        {/* Integration Selection */}
        {preferences.autoGenerate && availableIntegrations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include Data From
              <Tooltip content="Select which connected integrations to include in automatic reflection generation.">
                <svg className="w-4 h-4 ml-1 text-gray-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Tooltip>
            </label>
            <div className="space-y-2">
              {availableIntegrations.map(integration => (
                <label key={integration} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.includeIntegrations.includes(integration)}
                    onChange={(e) => handleIntegrationToggle(integration, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading || isSubmitting}
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {integration.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
            {availableIntegrations.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                No integrations connected. Connect integrations in the Integrations tab to include their data.
              </p>
            )}
          </div>
        )}

        {/* Notification Preferences */}
        {preferences.autoGenerate && (
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={preferences.notifyOnGeneration}
                onChange={(e) => handlePreferenceChange('notifyOnGeneration', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading || isSubmitting}
              />
              Email me when reflection is ready
              <Tooltip content="Receive an email notification when your automated reflection has been generated and is ready for review.">
                <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Tooltip>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              Get notified when your reflection is generated and ready for review/editing.
            </p>
          </div>
        )}

        {/* Action Buttons - Fixed height container to prevent layout shifts */}
        <div className="pt-4 border-t">
          {/* Success Message - Fixed height container */}
          <div className="h-12 mb-4 flex items-center">
            {saveSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg w-full">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700 font-medium">
                  Preferences saved successfully!
                </span>
              </div>
            )}
          </div>
          
          {/* Button Container */}
          <div className="flex justify-between items-center">
            <div>
              {onClose && saveSuccess && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Done
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              {onClose && !saveSuccess && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || isSubmitting || (!hasUnsavedChanges && !saveSuccess)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}