/**
 * Manual Reflection Generator Component
 * 
 * Provides a button for users to manually trigger reflection generation
 */

'use client'

import { useState, useCallback } from 'react'
import { useManualReflectionGeneration } from '../hooks/useManualReflectionGeneration'
import { getCurrentWeekNumber } from '../lib/week-utils'
import { Tooltip } from './Tooltip'

interface ManualReflectionGeneratorProps {
  onReflectionGenerated?: (operationId: string) => void
  className?: string
  disabled?: boolean
}

export function ManualReflectionGenerator({
  onReflectionGenerated,
  className = '',
  disabled = false
}: ManualReflectionGeneratorProps): JSX.Element {
  const { isGenerating, error, generateReflection } = useManualReflectionGeneration()
  const [lastError, setLastError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleGenerate = useCallback(async () => {
    try {
      setLastError(null)
      setShowSuccess(false)

      const result = await generateReflection()
      
      if (result) {
        setShowSuccess(true)
        onReflectionGenerated?.(result.operationId)
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate reflection'
      setLastError(errorMessage)
    }
  }, [generateReflection, onReflectionGenerated])

  const currentWeek = getCurrentWeekNumber()
  const displayError = error || lastError

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={disabled || isGenerating}
        className={`w-full p-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isGenerating
            ? 'bg-blue-100 text-blue-600 cursor-wait'
            : disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
        }`}
        aria-label={`Generate reflection for week ${currentWeek}`}
      >
        <div className="flex items-center justify-center space-x-2">
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Generating Reflection...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Reflection Now</span>
            </>
          )}
        </div>
      </button>

      {/* Helper Text */}
      <div className="flex items-start space-x-2 text-sm text-gray-600">
        <Tooltip content="Uses your connected integrations and previous reflections to automatically create a comprehensive weekly summary.">
          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Tooltip>
        <span>
          Automatically creates a reflection for Week {currentWeek} using your integration data
        </span>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700 font-medium">
              Reflection generation started! It will appear in your list when ready.
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">Generation failed</p>
              <p className="text-sm text-red-600 mt-1">{displayError}</p>
            </div>
            <button
              onClick={() => {
                setLastError(null)
              }}
              className="text-red-400 hover:text-red-600 p-1"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Generating reflection...</span>
            <span>~2 minutes</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}
    </div>
  )
}