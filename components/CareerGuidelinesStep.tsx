/**
 * Career Guidelines Step Component for Onboarding Wizard
 * 
 * Displays async-generated career guidelines with editing capabilities.
 * Integrates with the background job processing system.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { useCareerGuidelinesGeneration } from '../hooks/useAsyncOperation'

interface CareerGuidelinesStepProps {
  role: string
  level: string
  companyLadder?: string
  onComplete: (careerGuidelines: {
    currentLevelPlan: string
    nextLevelExpectations: string
    companyLadder?: string
  }) => void
  autoGenerate?: boolean
  showContinueButton?: boolean
  externalOperation?: any
  externalIsGenerating?: boolean
  externalIsComplete?: boolean
  externalError?: any
  externalProgress?: number
  onRegenerate?: () => void
}

export function CareerGuidelinesStep({
  role,
  level,
  companyLadder,
  onComplete,
  autoGenerate = true,
  showContinueButton = true,
  externalOperation,
  externalIsGenerating,
  externalIsComplete,
  externalError,
  externalProgress,
  onRegenerate
}: CareerGuidelinesStepProps) {
  const {
    generateCareerGuidelines,
    operation: internalOperation,
    isCreating: internalIsCreating,
    isComplete: internalIsComplete,
    isError: internalIsError,
    progress: internalProgress,
    error: internalError,
    timeRemaining
  } = useCareerGuidelinesGeneration()

  // Use external operation if provided, otherwise use internal
  const operation = externalOperation || internalOperation
  const isCreating = externalIsGenerating !== undefined ? externalIsGenerating : internalIsCreating
  const isComplete = externalIsComplete !== undefined ? externalIsComplete : internalIsComplete
  const isError = externalError !== undefined ? externalError : internalIsError
  const progress = externalProgress !== undefined ? externalProgress : internalProgress
  const error = externalError || internalError

  const [currentLevelPlan, setCurrentLevelPlan] = useState('')
  const [nextLevelExpectations, setNextLevelExpectations] = useState('')
  const [editedCompanyLadder, setEditedCompanyLadder] = useState(companyLadder || '')
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false)

  // Auto-start generation when component mounts
  useEffect(() => {
    if (autoGenerate && role && level && !hasStartedGeneration && !operation) {
      setHasStartedGeneration(true)
      generateCareerGuidelines({
        role,
        level,
        companyLadder
      })
    }
  }, [autoGenerate, role, level, companyLadder, hasStartedGeneration, operation, generateCareerGuidelines])

  // Handle completed generation
  useEffect(() => {
    if (isComplete && operation?.resultData) {
      const result = operation.resultData
      setCurrentLevelPlan(result.currentLevelPlan || '')
      setNextLevelExpectations(result.nextLevelExpectations || '')
    }
  }, [isComplete, operation])

  const handleSave = () => {
    onComplete({
      currentLevelPlan,
      nextLevelExpectations,
      companyLadder: editedCompanyLadder
    })
  }

  const handleRegenerate = () => {
    if (onRegenerate) {
      // Use external regenerate callback
      onRegenerate()
    } else {
      // Use internal generation
      setHasStartedGeneration(true)
      generateCareerGuidelines({
        role,
        level,
        companyLadder: editedCompanyLadder
      })
    }
  }

  const isGenerating = Boolean(isCreating || (operation && !isComplete))
  const canSave = currentLevelPlan.trim() && nextLevelExpectations.trim()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Your Career Guidelines
        </h2>
        <p className="mt-2 text-gray-600">
          {isGenerating 
            ? "We're crafting personalized career guidelines based on your role..."
            : "Review and customize your career guidelines"
          }
        </p>
      </div>

      {/* Company Career Ladder Upload (Optional) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-blue-900 mb-2">
          Company Career Ladder (Optional)
        </label>
        <textarea
          value={editedCompanyLadder}
          onChange={(e) => setEditedCompanyLadder(e.target.value)}
          placeholder="Paste your company's career ladder or progression guidelines here for more tailored results..."
          className="w-full p-3 border border-blue-300 rounded-md text-sm"
          rows={3}
          disabled={isGenerating}
        />
        <p className="mt-1 text-xs text-blue-600">
          Adding your company&apos;s career framework helps us generate more relevant expectations
        </p>
      </div>

      {/* Generation Status */}
      {isGenerating && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <LoadingSpinner size="sm" className="mr-3" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-yellow-800">
                  Generating your career guidelines...
                </span>
                <span className="text-sm text-yellow-600">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {timeRemaining && timeRemaining > 0 && (
                <p className="mt-1 text-xs text-yellow-600">
                  About {timeRemaining} seconds remaining...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Generation Failed
              </h3>
              <p className="mt-1 text-sm text-red-600">
                {error || 'Something went wrong while generating your career guidelines.'}
              </p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="ml-4 px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Generating...</span>
                </>
              ) : (
                'Try Again'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Career Guidelines Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Level Plan */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Current Level: {level} {role}
          </label>
          <textarea
            value={currentLevelPlan}
            onChange={(e) => setCurrentLevelPlan(e.target.value)}
            placeholder={isGenerating ? "Generating expectations for your current level..." : "What success looks like at your current level..."}
            className="w-full p-4 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            disabled={isGenerating}
          />
        </div>

        {/* Next Level Expectations */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Next Level Expectations
          </label>
          <textarea
            value={nextLevelExpectations}
            onChange={(e) => setNextLevelExpectations(e.target.value)}
            placeholder={isGenerating ? "Generating next level requirements..." : "What you need to achieve for promotion..."}
            className="w-full p-4 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4">
        <div className="flex space-x-3">
          {isComplete && (
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={isGenerating}
            >
              Regenerate Plan
            </button>
          )}
        </div>
        
        {showContinueButton && (
          <div className="flex space-x-3">
            <button
              onClick={() => onComplete({ currentLevelPlan: '', nextLevelExpectations: '', companyLadder: editedCompanyLadder })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Skip for Now
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || isGenerating}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Save Guidelines'}
            </button>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          These career guidelines will be used to provide context for all your future reflections and assessments.
          You can always edit it later in your profile settings.
        </p>
      </div>
    </div>
  )
}