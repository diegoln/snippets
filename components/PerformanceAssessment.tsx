/**
 * Performance Assessment Component
 * 
 * Allows users to generate AI-powered performance self-assessment drafts
 * based on their weekly snippets and career context through LLMProxy integration.
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  PerformanceAssessment,
  PerformanceAssessmentProps,
  AssessmentFormData,
  PerformanceAssessmentErrors,
  GenerationStatus,
  ASSESSMENT_CONSTANTS
} from '../types/performance'

export const PerformanceAssessmentComponent: React.FC<PerformanceAssessmentProps> = ({
  assessments,
  onGenerateDraft,
  onDeleteAssessment
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [selectedAssessment, setSelectedAssessment] = useState<PerformanceAssessment | null>(null)
  const [formData, setFormData] = useState<AssessmentFormData>({
    cycleName: '',
    startDate: '',
    endDate: '',
    assessmentDirections: ''
  })
  const [errors, setErrors] = useState<PerformanceAssessmentErrors>({})
  const [generationError, setGenerationError] = useState<string | null>(null)

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [])

  /**
   * Handle form submission to generate new draft
   */
  const handleGenerateNewDraft = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm(formData)) {
      return
    }

    setGenerationError(null)

    try {
      await onGenerateDraft(formData)
      // Reset form and close generation form immediately
      setFormData({ cycleName: '', startDate: '', endDate: '', assessmentDirections: '' })
      setIsGenerating(false) // Close the form
      setErrors({})
    } catch (error) {
      setGenerationError('Failed to generate performance assessment draft. Please try again.')
    }
  }, [formData, validateForm, onGenerateDraft])


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
          <h2 className="text-2xl font-bold text-gray-900">Performance Self-Assessment Drafts</h2>
          <p className="text-gray-600 mt-1">
            Generate AI-powered performance assessment drafts based on your weekly snippets
          </p>
        </div>
        {!isGenerating && (
          <button
            onClick={() => setIsGenerating(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Generate Assessment
          </button>
        )}
      </div>

      {/* Generate Draft Form */}
      {isGenerating && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Performance Assessment Draft</h3>
          
          <form onSubmit={handleGenerateNewDraft} className="space-y-4">
            <div>
              <label htmlFor="cycleName" className="block text-sm font-medium text-gray-700 mb-1">
                Performance Cycle Name
                <span className="text-gray-500 text-xs ml-1" title="A descriptive name for your performance review period">ⓘ</span>
              </label>
              <input
                type="text"
                id="cycleName"
                value={formData.cycleName}
                onChange={(e) => setFormData(prev => ({ ...prev, cycleName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., H1 2025, Q4 2024, Annual Review 2025"
              />
              {errors.cycleName && (
                <p className="text-red-600 text-sm mt-1">{errors.cycleName}</p>
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
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.startDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>
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
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.endDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>
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
                value={formData.assessmentDirections || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assessmentDirections: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="e.g., Focus on leadership achievements, include technical contributions, emphasize cross-team collaboration..."
              />
              {errors.assessmentDirections && (
                <p className="text-red-600 text-sm mt-1">{errors.assessmentDirections}</p>
              )}
            </div>

            {errors.general && (
              <p className="text-red-600 text-sm">{errors.general}</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsGenerating(false)
                  setFormData({ cycleName: '', startDate: '', endDate: '', assessmentDirections: '' })
                  setErrors({})
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Generate Draft
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generation Error */}
      {generationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Generation Failed</p>
          <p className="text-red-600 text-sm mt-1">{generationError}</p>
          <button 
            onClick={() => setGenerationError(null)}
            className="text-red-600 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Assessments List */}
      <div className="space-y-4">
        {assessments.length === 0 && !isGenerating ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Assessment Drafts Yet</h3>
            <p className="text-gray-600 mb-4">
              Generate your first AI-powered performance assessment draft based on your weekly snippets.
            </p>
            <button
              onClick={() => setIsGenerating(true)}
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
                    <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 max-h-32 overflow-y-auto">
                      {assessment.generatedDraft.substring(0, ASSESSMENT_CONSTANTS.DRAFT_PREVIEW_LENGTH).replace(/[<>&"']/g, '')}...
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
                      onClick={() => setSelectedAssessment(assessment)}
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
      {selectedAssessment && selectedAssessment.generatedDraft && !selectedAssessment.isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedAssessment.cycleName} - Generated Draft
                </h3>
                <button
                  onClick={() => setSelectedAssessment(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {selectedAssessment.generatedDraft.replace(/[<>&"']/g, '')}
                </pre>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => navigator.clipboard.writeText(selectedAssessment.generatedDraft || '')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setSelectedAssessment(null)}
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