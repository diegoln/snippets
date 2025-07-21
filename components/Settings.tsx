/**
 * Settings Component - Performance Cycle Configuration
 * 
 * This component provides a settings interface where users can configure
 * their performance cycle information including job title, seniority level,
 * career ladder documents, and previous performance feedback.
 * 
 * Features:
 * - Form validation with real-time error feedback
 * - File upload with validation and progress indication
 * - Accessibility compliance with ARIA labels and keyboard navigation
 * - Memory-optimized with proper cleanup and memoization
 * - Type-safe with comprehensive error handling
 */

'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Tooltip } from './Tooltip'
import { useFileUpload } from '../hooks/useFileUpload'
import { VALIDATION_MESSAGES, ARIA_LABELS, FORM_FIELDS } from '../constants/settings'
import type { 
  PerformanceSettings, 
  SettingsProps, 
  SettingsErrors, 
  FormState,
  SettingsFieldName 
} from '../types/settings'


/**
 * Settings Component
 * 
 * Provides a comprehensive settings interface for performance cycle configuration
 * with proper validation, help tooltips, and accessibility features.
 */
export function Settings({ onSave, onClose, initialSettings = {} }: SettingsProps): JSX.Element {
  // Form state management with memoized initial state
  const initialFormState = useMemo<PerformanceSettings>(() => ({
    jobTitle: initialSettings.jobTitle || '',
    seniorityLevel: initialSettings.seniorityLevel || '',
    careerLadderFile: initialSettings.careerLadderFile || null,
    performanceFeedback: initialSettings.performanceFeedback || '',
    performanceFeedbackFile: initialSettings.performanceFeedbackFile || null
  }), [initialSettings])

  const [settings, setSettings] = useState<PerformanceSettings>(initialFormState)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    submitError: null,
    hasUnsavedChanges: false
  })

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const feedbackFileInputRef = useRef<HTMLInputElement>(null)

  // File upload hooks with proper error handling
  const careerLadderUpload = useFileUpload({
    onSuccess: (file) => {
      setSettings(prev => ({ ...prev, careerLadderFile: file }))
      setFormState(prev => ({ ...prev, hasUnsavedChanges: true }))
    },
    onError: (error) => setErrors(prev => ({ ...prev, careerLadderFile: error })),
    onClear: () => {
      setSettings(prev => ({ ...prev, careerLadderFile: null }))
      setFormState(prev => ({ ...prev, hasUnsavedChanges: true }))
    }
  })

  const feedbackFileUpload = useFileUpload({
    onSuccess: (file) => {
      setSettings(prev => ({ ...prev, performanceFeedbackFile: file }))
      setFormState(prev => ({ ...prev, hasUnsavedChanges: true }))
    },
    onError: (error) => setErrors(prev => ({ ...prev, performanceFeedbackFile: error })),
    onClear: () => {
      setSettings(prev => ({ ...prev, performanceFeedbackFile: null }))
      setFormState(prev => ({ ...prev, hasUnsavedChanges: true }))
    }
  })

  /**
   * Handle input field changes with unsaved changes tracking
   */
  const handleInputChange = useCallback((field: SettingsFieldName, value: string): void => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setFormState(prev => ({ ...prev, hasUnsavedChanges: true }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  /**
   * Handle career ladder file upload
   */
  const handleCareerLadderUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    careerLadderUpload.handleFileChange(event)
  }, [careerLadderUpload])

  /**
   * Handle performance feedback file upload  
   */
  const handleFeedbackFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    feedbackFileUpload.handleFileChange(event)
  }, [feedbackFileUpload])

  /**
   * Remove career ladder file
   */
  const handleRemoveCareerLadderFile = useCallback((): void => {
    careerLadderUpload.clearFile(fileInputRef)
    setErrors(prev => ({ ...prev, careerLadderFile: undefined }))
  }, [careerLadderUpload])

  /**
   * Remove performance feedback file
   */
  const handleRemoveFeedbackFile = useCallback((): void => {
    feedbackFileUpload.clearFile(feedbackFileInputRef)
    setErrors(prev => ({ ...prev, performanceFeedbackFile: undefined }))
  }, [feedbackFileUpload])

  /**
   * Validate form data with memoized validation rules
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: SettingsErrors = {}

    // Job title validation
    if (!settings.jobTitle.trim()) {
      newErrors.jobTitle = VALIDATION_MESSAGES.JOB_TITLE_REQUIRED
    }

    // Seniority level validation
    if (!settings.seniorityLevel.trim()) {
      newErrors.seniorityLevel = VALIDATION_MESSAGES.SENIORITY_LEVEL_REQUIRED
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [settings])

  /**
   * Handle form submission with comprehensive error handling
   */
  const handleSubmit = useCallback(async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setFormState(prev => ({ 
      ...prev, 
      isSubmitting: true, 
      submitError: null 
    }))
    
    try {
      await onSave(settings)
      setFormState(prev => ({ 
        ...prev, 
        hasUnsavedChanges: false 
      }))
    } catch (error) {
      console.error('Error saving settings:', error)
      setFormState(prev => ({ 
        ...prev, 
        submitError: error instanceof Error ? error.message : VALIDATION_MESSAGES.SAVE_ERROR 
      }))
    } finally {
      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false 
      }))
    }
  }, [settings, validateForm, onSave])

  /**
   * Handle modal close with unsaved changes warning
   */
  const handleClose = useCallback(() => {
    if (formState.hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }, [formState.hasUnsavedChanges, onClose])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear any pending timeouts or intervals
      setErrors({})
      setFormState({
        isSubmitting: false,
        submitError: null,
        hasUnsavedChanges: false
      })
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Performance Cycle Settings</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={ARIA_LABELS.CLOSE_SETTINGS}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Submit Error Display */}
          {formState.submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{formState.submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title Field */}
            <div>
              <label htmlFor={FORM_FIELDS.JOB_TITLE} className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Job Title <span className="text-red-500 ml-1">*</span>
                <Tooltip content="Your current job title (e.g., Senior Software Engineer, Product Manager).">
                  <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              <input
                id={FORM_FIELDS.JOB_TITLE}
                type="text"
                value={settings.jobTitle}
                onChange={(e) => handleInputChange(FORM_FIELDS.JOB_TITLE, e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.jobTitle ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Senior Software Engineer"
                aria-describedby={errors.jobTitle ? `${FORM_FIELDS.JOB_TITLE}-error` : undefined}
                disabled={formState.isSubmitting}
              />
              {errors.jobTitle && (
                <p id={`${FORM_FIELDS.JOB_TITLE}-error`} className="mt-1 text-sm text-red-600">
                  {errors.jobTitle}
                </p>
              )}
            </div>

            {/* Seniority Level Field */}
            <div>
              <label htmlFor="seniorityLevel" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Seniority Level <span className="text-red-500 ml-1">*</span>
                <Tooltip content="Your company's level or title (e.g., Senior Engineer, L5, Staff, Principal).">
                  <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              <input
                id="seniorityLevel"
                type="text"
                value={settings.seniorityLevel}
                onChange={(e) => handleInputChange('seniorityLevel', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.seniorityLevel ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Senior Software Engineer, L5, Staff Engineer, Principal"
                aria-describedby={errors.seniorityLevel ? "seniorityLevel-error" : undefined}
              />
              {errors.seniorityLevel && (
                <p id="seniorityLevel-error" className="mt-1 text-sm text-red-600">
                  {errors.seniorityLevel}
                </p>
              )}
            </div>

            {/* Career Ladder Upload */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Career Ladder Document <span className="text-gray-500 ml-1">(Optional)</span>
                <Tooltip content="Upload your company's career ladder document. PDF, Word, or text files (max 10MB).">
                  <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleCareerLadderUpload}
                  className="hidden"
                  id="careerLadderFile"
                />
                
                <label
                  htmlFor="careerLadderFile"
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-200 transition-colors focus-within:ring-2 focus-within:ring-blue-500"
                >
                  Choose File
                </label>
                
                {settings.careerLadderFile && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {settings.careerLadderFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCareerLadderFile}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      aria-label={ARIA_LABELS.REMOVE_FILE}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {errors.careerLadderFile && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.careerLadderFile}
                </p>
              )}
            </div>

            {/* Performance Feedback Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Previous Performance Feedback <span className="text-gray-500 ml-1">(Optional)</span>
                <Tooltip content="Upload review document OR paste text below. File takes priority over text.">
                  <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Tooltip>
              </label>
              
              {/* File Upload Option */}
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    ref={feedbackFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFeedbackFileUpload}
                    className="hidden"
                    id="performanceFeedbackFile"
                  />
                  
                  <label
                    htmlFor="performanceFeedbackFile"
                    className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors text-sm"
                  >
                    📄 Upload Feedback Document
                  </label>
                  
                  {settings.performanceFeedbackFile && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600 font-medium">
                        {settings.performanceFeedbackFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFeedbackFile}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        aria-label={ARIA_LABELS.REMOVE_FEEDBACK_FILE}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                {errors.performanceFeedbackFile && (
                  <p className="text-sm text-red-600">
                    {errors.performanceFeedbackFile}
                  </p>
                )}
              </div>

              {/* Text Input Option */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Or paste feedback text:</span>
                  {settings.performanceFeedbackFile && (
                    <span className="text-xs text-amber-600 font-medium">
                      📄 File uploaded - text will be ignored
                    </span>
                  )}
                </div>
                <textarea
                  id="performanceFeedback"
                  value={settings.performanceFeedback}
                  onChange={(e) => handleInputChange('performanceFeedback', e.target.value)}
                  rows={6}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    settings.performanceFeedbackFile ? 'opacity-60' : ''
                  }`}
                  placeholder={
                    settings.performanceFeedbackFile 
                      ? 'File uploaded - this text field will be ignored'
                      : 'Paste feedback from your last performance review, including strengths, areas for improvement, and goals...'
                  }
                />
              </div>
              
              <p className="mt-2 text-xs text-gray-500">
                💡 <strong>Priority:</strong> If you upload a file, it will be used instead of the text field. 
                This information helps generate more relevant snippet suggestions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                disabled={formState.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formState.isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState.isSubmitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}