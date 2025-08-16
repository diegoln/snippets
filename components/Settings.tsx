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
import { signOut } from 'next-auth/react'
import { Tooltip } from './Tooltip'
import { Integrations } from './Integrations'
import { ReflectionPreferencesComponent } from './ReflectionPreferences'
import { RoleAndGuidelinesStep } from './RoleAndGuidelinesStep'
import { LoadingSpinner } from './LoadingSpinner'
import { SettingsActions } from './SettingsActions'
import { useFileUpload } from '../hooks/useFileUpload'
import { useReflectionPreferences } from '../hooks/useReflectionPreferences'
import { VALIDATION_MESSAGES, ARIA_LABELS } from '../constants/settings'
import { VALID_ROLES, VALID_LEVELS } from '../constants/user'
import { getClientEnvironmentMode } from '../lib/environment'
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
    performanceFeedback: initialSettings.performanceFeedback || '',
    performanceFeedbackFile: initialSettings.performanceFeedbackFile || null
  }), [initialSettings])

  // User profile state for role/guidelines
  const [userProfile, setUserProfile] = useState<{
    jobTitle: string
    seniorityLevel: string
    careerGuidelines?: {
      currentLevelPlan: string
      nextLevelExpectations: string
      companyLadder?: string
    }
  } | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const [activeSettingsTab, setActiveSettingsTab] = useState<'performance' | 'role-guidelines' | 'integrations' | 'reflections'>('performance')
  const [settings, setSettings] = useState<PerformanceSettings>(initialFormState)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    submitError: null,
    hasUnsavedChanges: false
  })
  
  // Success states for save feedback (per tab)
  const [performanceSaveSuccess, setPerformanceSaveSuccess] = useState(false)
  const [roleGuidelinesSaveSuccess, setRoleGuidelinesSaveSuccess] = useState(false)
  const [reflectionPreferencesSaveSuccess, setReflectionPreferencesSaveSuccess] = useState(false)

  // Refs for file inputs
  const feedbackFileInputRef = useRef<HTMLInputElement>(null)

  // Reflection preferences hook
  const reflectionPreferences = useReflectionPreferences()

  // File upload hooks with proper error handling

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
    setPerformanceSaveSuccess(false) // Clear success state when user makes changes
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [errors])


  /**
   * Handle performance feedback file upload  
   */
  const handleFeedbackFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    feedbackFileUpload.handleFileChange(event)
  }, [feedbackFileUpload])


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

    // Performance tab only validates file-related errors
    // Job title and seniority level are handled in Role & Guidelines tab

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [])

  /**
   * Handle performance settings save (extracted from form submission)
   */
  const handlePerformanceSave = useCallback(async (): Promise<void> => {
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
      setPerformanceSaveSuccess(true)
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
   * Handle form submission with comprehensive error handling
   */
  const handleSubmit = useCallback(async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    await handlePerformanceSave()
  }, [handlePerformanceSave])

  /**
   * Handle role and guidelines update from the Role & Guidelines tab
   */
  const handleRoleAndGuidelinesUpdate = useCallback(async (data: {
    role: string
    customRole: string
    level: string
    customLevel: string
    careerGuidelines: {
      currentLevelPlan: string
      nextLevelExpectations: string
      companyLadder?: string
    }
  }) => {
    setFormState(prev => ({ 
      ...prev, 
      isSubmitting: true, 
      submitError: null 
    }))
    
    try {
      const effectiveRole = data.role === 'other' ? data.customRole : data.role
      const effectiveLevel = data.level === 'other' ? data.customLevel : data.level
      
      // Save profile - API will use session or dev auth automatically
      const profileResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobTitle: effectiveRole,
          seniorityLevel: effectiveLevel,
        }),
      })
      
      if (!profileResponse.ok) {
        throw new Error('Failed to update profile')
      }
      
      // Save career guidelines
      if (data.careerGuidelines.currentLevelPlan && data.careerGuidelines.nextLevelExpectations) {
        const guidelinesResponse = await fetch('/api/user/career-guidelines', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentLevelPlan: data.careerGuidelines.currentLevelPlan,
            nextLevelExpectations: data.careerGuidelines.nextLevelExpectations,
            companyLadder: data.careerGuidelines.companyLadder
          })
        })
        
        if (!guidelinesResponse.ok) {
          console.warn('Failed to save career guidelines, but continuing...')
          // Show warning to user about partial save
          setFormState(prev => ({ 
            ...prev, 
            submitError: 'Profile updated successfully, but career guidelines failed to save. Please try again.' 
          }))
        }
      }
      
      // Update local state
      setUserProfile({
        jobTitle: effectiveRole,
        seniorityLevel: effectiveLevel,
        careerGuidelines: data.careerGuidelines
      })
      
      // Note: Role and level are managed in userProfile state, not settings
      
      setFormState(prev => ({ 
        ...prev, 
        hasUnsavedChanges: false 
      }))
      
      setRoleGuidelinesSaveSuccess(true)
      
    } catch (error) {
      console.error('Error updating role and guidelines:', error)
      setFormState(prev => ({ 
        ...prev, 
        submitError: error instanceof Error ? error.message : 'Failed to update role and guidelines' 
      }))
    } finally {
      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false 
      }))
    }
  }, [setFormState, setUserProfile])

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

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoadingProfile(true)
        
        // Load user profile and career guidelines in parallel - APIs will use session or dev auth automatically
        const [profileResponse, guidelinesResponse] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/career-guidelines')
        ])
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          
          let careerGuidelines
          if (guidelinesResponse.ok) {
            careerGuidelines = await guidelinesResponse.json()
          }
          
          setUserProfile({
            jobTitle: profileData.jobTitle || '',
            seniorityLevel: profileData.seniorityLevel || '',
            careerGuidelines: careerGuidelines ? {
              currentLevelPlan: careerGuidelines.currentLevelPlan || '',
              nextLevelExpectations: careerGuidelines.nextLevelExpectations || '',
              companyLadder: careerGuidelines.companyLadder || ''
            } : undefined
          })
          
          // Update settings with performance feedback from profile
          setSettings(prev => ({
            ...prev,
            performanceFeedback: profileData.performanceFeedback || ''
          }))
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    
    loadUserProfile()
  }, [])

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
    <div className="fixed inset-0 bg-neutral-600/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
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

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveSettingsTab('performance')
                  // Clear success states when switching tabs
                  setRoleGuidelinesSaveSuccess(false)
                  setReflectionPreferencesSaveSuccess(false)
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSettingsTab === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => {
                  setActiveSettingsTab('role-guidelines')
                  // Clear success states when switching tabs
                  setPerformanceSaveSuccess(false)
                  setReflectionPreferencesSaveSuccess(false)
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSettingsTab === 'role-guidelines'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Role & Guidelines
              </button>
              <button
                onClick={() => {
                  setActiveSettingsTab('integrations')
                  // Clear success states when switching tabs
                  setPerformanceSaveSuccess(false)
                  setRoleGuidelinesSaveSuccess(false)
                  setReflectionPreferencesSaveSuccess(false)
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSettingsTab === 'integrations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Integrations
              </button>
              <button
                onClick={() => {
                  setActiveSettingsTab('reflections')
                  // Clear success states when switching tabs
                  setPerformanceSaveSuccess(false)
                  setRoleGuidelinesSaveSuccess(false)
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSettingsTab === 'reflections'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reflection Automation
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeSettingsTab === 'performance' ? (
            <>
              {/* Submit Error Display */}
              {formState.submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{formState.submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">


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

            {/* Account Management */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account</h3>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sign Out
              </button>
            </div>

            {/* Action Buttons */}
            <SettingsActions
              isSubmitting={formState.isSubmitting}
              saveSuccess={performanceSaveSuccess}
              hasError={!!formState.submitError}
              successMessage="Performance settings saved successfully!"
              saveButtonLabel="Save Settings"
              onSave={handlePerformanceSave}
              onCancel={handleClose}
            />
              </form>
            </>
          ) : activeSettingsTab === 'role-guidelines' ? (
            <>
              {/* Error Display */}
              {formState.submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{formState.submitError}</p>
                </div>
              )}
              
              {isLoadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                  <span className="ml-3 text-gray-600">Loading your profile...</span>
                </div>
              ) : userProfile ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">
                      Update Your Role & Career Guidelines
                    </h3>
                    <p className="text-sm text-blue-700">
                      Changes to your role or level will regenerate your career guidelines to ensure they stay relevant.
                    </p>
                  </div>
                  
                  <RoleAndGuidelinesStep
                    initialRole={userProfile.jobTitle && VALID_ROLES.includes(userProfile.jobTitle as typeof VALID_ROLES[number]) ? userProfile.jobTitle : 'other'}
                    initialLevel={userProfile.seniorityLevel && VALID_LEVELS.includes(userProfile.seniorityLevel as typeof VALID_LEVELS[number]) ? userProfile.seniorityLevel : 'other'}
                    initialCustomRole={userProfile.jobTitle && !VALID_ROLES.includes(userProfile.jobTitle as typeof VALID_ROLES[number]) ? userProfile.jobTitle : ''}
                    initialCustomLevel={userProfile.seniorityLevel && !VALID_LEVELS.includes(userProfile.seniorityLevel as typeof VALID_LEVELS[number]) ? userProfile.seniorityLevel : ''}
                    initialCareerGuidelines={userProfile.careerGuidelines}
                    mode="settings"
                    isSubmitting={formState.isSubmitting}
                    saveSuccess={roleGuidelinesSaveSuccess}
                    onComplete={handleRoleAndGuidelinesUpdate}
                    onCancel={handleClose}
                  />
                  
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Failed to load profile data. Please try refreshing the page.</p>
                </div>
              )}
            </>
          ) : activeSettingsTab === 'integrations' ? (
            <Integrations />
          ) : (
            <ReflectionPreferencesComponent
              onSave={async (preferences) => {
                try {
                  await reflectionPreferences.updatePreferences(preferences)
                  setReflectionPreferencesSaveSuccess(true)
                } catch (error) {
                  throw error // Re-throw to let ReflectionPreferencesComponent handle display
                }
              }}
              onClose={handleClose}
              initialPreferences={reflectionPreferences.preferences || undefined}
              availableIntegrations={reflectionPreferences.availableIntegrations}
              isLoading={reflectionPreferences.isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}