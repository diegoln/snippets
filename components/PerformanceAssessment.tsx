/**
 * Performance Assessment Component
 * 
 * Allows users to generate AI-powered performance self-assessment drafts
 * based on their weekly snippets and career context through LLMProxy integration.
 */

'use client'

import React, { useReducer, useCallback } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { LoadingSpinner } from './LoadingSpinner'
import {
  PerformanceAssessment,
  PerformanceAssessmentProps,
  AssessmentFormData,
  PerformanceAssessmentErrors,
  PerformanceAssessmentState,
  UIStateAction,
  FormState,
  GenerationState,
  ASSESSMENT_CONSTANTS
} from '../types/performance'

/**
 * State reducer for managing UI state with proper state machine
 */
function uiStateReducer(state: PerformanceAssessmentState, action: UIStateAction): PerformanceAssessmentState {
  switch (action.type) {
    case 'OPEN_FORM':
      return {
        ...state,
        formState: { type: 'open' },
        generationState: { type: 'idle' },
        errors: {}
      }
    
    case 'CLOSE_FORM':
      return {
        ...state,
        formState: { type: 'closed' },
        generationState: { type: 'idle' },
        formData: { cycleName: '', startDate: '', endDate: '', assessmentDirections: '' },
        errors: {}
      }
    
    case 'START_GENERATION':
      return {
        ...state,
        formState: { type: 'submitting' },
        generationState: { type: 'generating' },
        errors: {}
      }
    
    case 'GENERATION_SUCCESS':
      return {
        ...state,
        formState: { type: 'closed' },
        generationState: { type: 'success' },
        formData: { cycleName: '', startDate: '', endDate: '', assessmentDirections: '' },
        errors: {}
      }
    
    case 'GENERATION_ERROR':
      return {
        ...state,
        formState: { type: 'open' },
        generationState: { type: 'error', message: action.message }
      }
    
    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.data }
      }
    
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors
      }
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        generationState: { type: 'idle' },
        errors: {}
      }
    
    case 'SELECT_ASSESSMENT':
      return {
        ...state,
        selectedAssessment: action.assessment
      }
    
    default:
      return state
  }
}

/**
 * Initial state for the UI state machine
 */
const initialUIState: PerformanceAssessmentState = {
  formState: { type: 'closed' },
  generationState: { type: 'idle' },
  formData: { cycleName: '', startDate: '', endDate: '', assessmentDirections: '' },
  errors: {},
  selectedAssessment: null
}

export const PerformanceAssessmentComponent: React.FC<PerformanceAssessmentProps> = ({
  assessments,
  onGenerateDraft,
  onDeleteAssessment
}) => {
  const [state, dispatch] = useReducer(uiStateReducer, initialUIState)

  /**
   * Validate form data
   */
  const validateForm = useCallback((data: AssessmentFormData): boolean => {
    const newErrors: PerformanceAssessmentErrors = {}

    if (!data.cycleName.trim()) {
      newErrors.cycleName = 'Performance cycle name is required'
    } else if (data.cycleName.length > ASSESSMENT_CONSTANTS.MAX_CYCLE_NAME_LENGTH) {
      newErrors.cycleName = `Cycle name must be less than ${ASSESSMENT_CONSTANTS.MAX_CYCLE_NAME_LENGTH} characters`
    }

    if (!data.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!data.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    if (data.assessmentDirections && data.assessmentDirections.length > ASSESSMENT_CONSTANTS.MAX_DIRECTIONS_LENGTH) {
      newErrors.assessmentDirections = `Directions must be less than ${ASSESSMENT_CONSTANTS.MAX_DIRECTIONS_LENGTH} characters`
    }

    dispatch({ type: 'SET_ERRORS', errors: newErrors })
    return Object.keys(newErrors).length === 0
  }, [dispatch])

  /**
   * Handle form submission to generate new draft
   */
  const handleGenerateNewDraft = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm(state.formData)) {
      return
    }

    dispatch({ type: 'START_GENERATION' })

    try {
      await onGenerateDraft(state.formData)
      dispatch({ type: 'GENERATION_SUCCESS' })
    } catch (error) {
      dispatch({ 
        type: 'GENERATION_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to generate performance assessment draft. Please try again.'
      })
    }
  }, [state.formData, validateForm, onGenerateDraft, dispatch])

  /**
   * Derived state helpers
   */
  const isFormOpen = state.formState.type === 'open' || state.formState.type === 'submitting'
  const isGenerating = state.generationState.type === 'generating'
  const isFormDisabled = state.formState.type === 'submitting'
  const generationError = state.generationState.type === 'error' ? state.generationState.message : null

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])


  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-heading-2 text-primary">Performance Self-Assessment Drafts</h2>
          <p className="text-secondary mt-1">
            Generate AI-powered performance assessment drafts based on your weekly snippets
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => dispatch({ type: 'OPEN_FORM' })}
            className="btn-accent px-4 py-2 rounded-pill font-medium transition-advance shadow-elevation-1"
            aria-label="Open form to generate new performance assessment"
          >
            + Generate Assessment
          </button>
        )}
      </div>

      {/* Generate Draft Form */}
      {isFormOpen && (
        <div 
          className="card bg-surface p-6"
          role="region" 
          aria-labelledby="form-heading"
          aria-describedby="form-description"
        >
          <h3 id="form-heading" className="text-heading-2 text-primary mb-4">Generate Performance Assessment Draft</h3>
          <p id="form-description" className="sr-only">Fill out this form to generate an AI-powered performance assessment draft based on your weekly snippets</p>
          
          <form onSubmit={handleGenerateNewDraft} className="space-y-4" aria-busy={isFormDisabled}>
            <div>
              <label htmlFor="cycleName" className="block text-sm font-medium text-gray-700 mb-1">
                Performance Cycle Name
                <span className="text-gray-500 text-xs ml-1" title="A descriptive name for your performance review period">ⓘ</span>
              </label>
              <input
                type="text"
                id="cycleName"
                value={state.formData.cycleName}
                onChange={(e) => dispatch({ type: 'SET_FORM_DATA', data: { cycleName: e.target.value } })}
                disabled={isFormDisabled}
                required
                aria-describedby={state.errors.cycleName ? 'cycleName-error' : 'cycleName-hint'}
                aria-invalid={!!state.errors.cycleName}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="e.g., H1 2025, Q4 2024, Annual Review 2025"
              />
              <span id="cycleName-hint" className="sr-only">A descriptive name for your performance review period</span>
              {state.errors.cycleName && (
                <p id="cycleName-error" className="text-red-600 text-sm mt-1" role="alert">{state.errors.cycleName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle Start Date
                  <span className="text-gray-500 text-xs ml-1" title="The beginning date of your performance review cycle">ⓘ</span>
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={state.formData.startDate}
                  onChange={(e) => dispatch({ type: 'SET_FORM_DATA', data: { startDate: e.target.value } })}
                  disabled={isFormDisabled}
                  required
                  aria-describedby={state.errors.startDate ? 'startDate-error' : 'startDate-hint'}
                  aria-invalid={!!state.errors.startDate}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                />
                <span id="startDate-hint" className="sr-only">The beginning date of your performance review cycle</span>
                {state.errors.startDate && (
                  <p id="startDate-error" className="text-red-600 text-sm mt-1" role="alert">{state.errors.startDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Cycle End Date
                  <span className="text-gray-500 text-xs ml-1" title="The ending date of your performance review cycle">ⓘ</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={state.formData.endDate}
                  onChange={(e) => dispatch({ type: 'SET_FORM_DATA', data: { endDate: e.target.value } })}
                  disabled={isFormDisabled}
                  required
                  aria-describedby={state.errors.endDate ? 'endDate-error' : 'endDate-hint'}
                  aria-invalid={!!state.errors.endDate}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                />
                <span id="endDate-hint" className="sr-only">The ending date of your performance review cycle</span>
                {state.errors.endDate && (
                  <p id="endDate-error" className="text-red-600 text-sm mt-1" role="alert">{state.errors.endDate}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="assessmentDirections" className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Directions (Optional)
                <span className="text-gray-500 text-xs ml-1" title="Provide specific guidelines or focus areas to influence the AI-generated draft">ⓘ</span>
              </label>
              <textarea
                id="assessmentDirections"
                value={state.formData.assessmentDirections || ''}
                onChange={(e) => dispatch({ type: 'SET_FORM_DATA', data: { assessmentDirections: e.target.value } })}
                disabled={isFormDisabled}
                aria-describedby={state.errors.assessmentDirections ? 'assessmentDirections-error' : 'assessmentDirections-hint'}
                aria-invalid={!!state.errors.assessmentDirections}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isFormDisabled ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                rows={3}
                placeholder="e.g., Focus on leadership achievements, include technical contributions, emphasize cross-team collaboration..."
              />
              <span id="assessmentDirections-hint" className="sr-only">Provide specific guidelines or focus areas to influence the AI-generated draft</span>
              {state.errors.assessmentDirections && (
                <p id="assessmentDirections-error" className="text-red-600 text-sm mt-1" role="alert">{state.errors.assessmentDirections}</p>
              )}
            </div>

            {state.errors.general && (
              <p className="text-red-600 text-sm">{state.errors.general}</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={isFormDisabled}
                onClick={() => dispatch({ type: 'CLOSE_FORM' })}
                className={`px-4 py-2 rounded-pill transition-advance ${
                  isFormDisabled
                    ? 'text-neutral-600/50 bg-neutral-100 cursor-not-allowed'
                    : 'text-secondary bg-neutral-100 hover:bg-primary-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFormDisabled}
                aria-describedby={isGenerating ? 'generation-status' : undefined}
                className={`btn-primary px-4 py-2 rounded-pill flex items-center space-x-2 min-w-[140px] justify-center ${
                  isFormDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Generate Draft</span>
                )}
              </button>
              {isGenerating && (
                <span id="generation-status" className="sr-only" aria-live="polite">
                  AI is generating your performance assessment draft. This may take up to 80 seconds.
                </span>
              )}
            </div>
          </form>
        </div>
      )}


      {/* Generation Error */}
      {generationError && (
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4" 
          role="alert" 
          aria-labelledby="error-title"
          aria-describedby="error-message"
        >
          <p id="error-title" className="text-red-800 font-medium">Generation Failed</p>
          <p id="error-message" className="text-red-600 text-sm mt-1">{generationError}</p>
          <button 
            onClick={() => dispatch({ type: 'CLEAR_ERRORS' })}
            className="text-red-600 text-sm underline mt-1"
            aria-label="Dismiss error message"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Assessments List */}
      <div className="space-y-4">
        {assessments.length === 0 && !isFormOpen ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Assessment Drafts Yet</h3>
            <p className="text-gray-600 mb-4">
              Generate your first AI-powered performance assessment draft based on your weekly snippets.
            </p>
            <button
              onClick={() => dispatch({ type: 'OPEN_FORM' })}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Generate Your First Assessment
            </button>
          </div>
        ) : (
          assessments
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((assessment) => (
            <div key={assessment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{assessment.cycleName}</h3>
                  <p className="text-gray-600 text-sm">
                    {formatDate(assessment.startDate)} - {formatDate(assessment.endDate)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                {assessment.isGenerating ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Generating Draft...</h4>
                      <p className="text-sm text-gray-600">AI is analyzing your snippets and creating your assessment</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="font-medium text-gray-900 mb-2">Draft Preview</h4>
                    <div className="bg-gray-50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                      <MarkdownRenderer 
                        content={assessment.generatedDraft.substring(0, ASSESSMENT_CONSTANTS.DRAFT_PREVIEW_LENGTH) + '...'}
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Created {formatDate(assessment.createdAt)}
                </p>
                <div className="space-x-2">
                  {assessment.isGenerating ? (
                    <button
                      disabled
                      className="bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                    >
                      Generating...
                    </button>
                  ) : (
                    <button
                      onClick={() => dispatch({ type: 'SELECT_ASSESSMENT', assessment })}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Draft
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteAssessment(assessment.id)}
                    className="text-red-600 hover:text-red-700 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Draft Viewer Modal */}
      {state.selectedAssessment && state.selectedAssessment.generatedDraft && !state.selectedAssessment.isGenerating && (
        <div 
          className="fixed inset-0 bg-neutral-600/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 id="modal-title" className="text-xl font-semibold text-gray-900">
                  {state.selectedAssessment.cycleName} - Generated Draft
                </h3>
                <button
                  onClick={() => dispatch({ type: 'SELECT_ASSESSMENT', assessment: null })}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  aria-label="Close draft viewer"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <MarkdownRenderer 
                content={state.selectedAssessment.generatedDraft}
                className="max-w-none"
              />
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => navigator.clipboard.writeText(state.selectedAssessment?.generatedDraft || '')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => dispatch({ type: 'SELECT_ASSESSMENT', assessment: null })}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceAssessmentComponent