/**
 * Reusable Settings Actions Component
 * 
 * Provides consistent button behavior and success messaging across all settings tabs.
 * Handles the Save/Cancel/Done state transitions with proper visual feedback.
 */

'use client'

import React from 'react'

interface SettingsActionsProps {
  // State props
  isSubmitting: boolean
  saveSuccess: boolean
  hasError?: boolean
  
  // Labels and messages
  successMessage: string
  saveButtonLabel?: string
  
  // Actions
  onSave: () => void | Promise<void>
  onCancel: () => void
  
  // Optional customization
  disabled?: boolean
  className?: string
}

export function SettingsActions({
  isSubmitting,
  saveSuccess,
  hasError = false,
  successMessage,
  saveButtonLabel = 'Save Settings',
  onSave,
  onCancel,
  disabled = false,
  className = ''
}: SettingsActionsProps): JSX.Element {
  
  const handleSave = async () => {
    try {
      await onSave()
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Save failed:', error)
    }
  }

  return (
    <div className={className}>
      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        {saveSuccess ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Done
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || disabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : saveButtonLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Compact version for inline use (without border-t)
 */
export function SettingsActionsInline({
  className = '',
  ...props
}: SettingsActionsProps): JSX.Element {
  return (
    <SettingsActions
      {...props}
      className={`${className}`}
    />
  )
}