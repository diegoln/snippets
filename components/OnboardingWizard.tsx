'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Logo } from './Logo'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorBoundary } from './ErrorBoundary'
import { getWeekDates } from '@/lib/utils'
import { getCurrentWeekNumber } from '@/lib/week-utils'
import { VALID_ROLES, VALID_LEVELS, ROLE_LABELS, LEVEL_LABELS, LEVEL_TIPS } from '@/constants/user'

// Constants
const SAVE_DEBOUNCE_MS = 500

// Enhanced input sanitization for role/level values
const sanitizeRoleInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potential XSS characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100) // Reasonable length limit
}

const validateRoleInput = (input: string): boolean => {
  const sanitized = sanitizeRoleInput(input)
  return sanitized.length >= 2 && sanitized.length <= 100 && /^[a-zA-Z0-9\s\-_]+$/.test(sanitized)
}
// Only import mock data in development
let getMockIntegrationBullets: (integrationType: string) => string[]
if (process.env.NODE_ENV === 'development') {
  getMockIntegrationBullets = require('@/lib/integration-mock-data').getMockIntegrationBullets
} else {
  // In production, provide empty function that returns no mock data
  getMockIntegrationBullets = () => []
}

// Role and level options from constants
const ROLES = VALID_ROLES.map(role => ({
  value: role,
  label: ROLE_LABELS[role],
}))

const LEVELS = VALID_LEVELS.map(level => ({
  value: level,
  label: LEVEL_LABELS[level],
}))

// Integration options
const INTEGRATIONS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    ),
    description: 'Extracts meeting context, 1:1s, and project discussions',
    color: 'blue',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
    description: 'Shows commits, PRs, and code reviews for technical impact',
    color: 'gray',
  },
  {
    id: 'jira',
    name: 'Jira/Linear',
    icon: (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.571 11.429H0a5.714 5.714 0 0 0 5.714 5.714h4a1.714 1.714 0 0 1 1.714 1.714v4A5.714 5.714 0 0 0 17.143 17.143V5.714A5.714 5.714 0 0 0 11.429 0v11.429zM24 12.571h-11.429v11.429A5.714 5.714 0 0 0 18.286 18.286h4A1.714 1.714 0 0 1 24 20v4"/>
      </svg>
    ),
    description: 'Tracks story points, bug fixes, and feature delivery',
    color: 'indigo',
  },
]

interface WizardFormData {
  role: string
  customRole: string
  level: string
  customLevel: string
  reflectionContent: string
}

interface LoadingState {
  isLoading: boolean
  operation?: 'saving-profile' | 'creating-snippet' | 'completing-onboarding'
  message?: string
}

interface OnboardingWizardProps {
  initialData?: {
    jobTitle?: string
    seniorityLevel?: string
  }
  clearPreviousProgress?: boolean
  onOnboardingComplete?: () => void
}

export function OnboardingWizard({ initialData, clearPreviousProgress = false, onOnboardingComplete }: OnboardingWizardProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Clear localStorage immediately if needed, before any state initialization
  if (clearPreviousProgress && typeof window !== 'undefined') {
    localStorage.removeItem('onboarding-progress')
  }
  
  // Always start at step 0 - localStorage restoration happens in useEffect if needed
  const [currentStep, setCurrentStep] = useState(0)
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false })
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [integrationBullets, setIntegrationBullets] = useState<Record<string, string[]>>({})
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set())

  // Standardized error handler for API responses
  const handleApiError = useCallback(async (response: Response, operation: string) => {
    const errorData = await response.json().catch(() => ({ 
      error: `Failed to ${operation.toLowerCase()}` 
    }))
    
    console.error(`${operation} failed:`, response.status, errorData)
    
    // Provide helpful error message for development
    if (response.status === 401 && process.env.NODE_ENV === 'development') {
      throw new Error('Please sign in first at /mock-signin')
    }
    
    throw new Error(errorData.error || `Failed to ${operation.toLowerCase()}`)
  }, [])
  
  const [formData, setFormData] = useState<WizardFormData>(() => {
    // Pre-fill with existing data if available
    const role = initialData?.jobTitle || ''
    const level = initialData?.seniorityLevel || ''
    
    // Check if the role/level are in our predefined lists
    const isKnownRole = VALID_ROLES.includes(role as any)
    const isKnownLevel = VALID_LEVELS.includes(level as any)
    
    return {
      role: isKnownRole ? role : (role ? 'other' : ''),
      customRole: !isKnownRole && role ? role : '',
      level: isKnownLevel ? level : (level ? 'other' : ''),
      customLevel: !isKnownLevel && level ? level : '',
      reflectionContent: '',
    }
  })

  // Ref to store debounce timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced localStorage save function
  const saveProgressToLocalStorage = useCallback((
    step: number,
    data: WizardFormData,
    integrations: Set<string>,
    bullets: Record<string, string[]>
  ) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      const progressData = {
        step,
        data,
        integrations: Array.from(integrations),
        bullets,
        timestamp: Date.now()
      }
      localStorage.setItem('onboarding-progress', JSON.stringify(progressData))
    }, SAVE_DEBOUNCE_MS) // Debounced save to localStorage
  }, [])

  // Load progress from localStorage on mount (only if not clearing previous progress)
  useEffect(() => {
    if (clearPreviousProgress) {
      // Clear any previous progress and start fresh
      localStorage.removeItem('onboarding-progress')
      // No need to setCurrentStep(0) since we already initialize to 0
      return
    }

    const savedProgress = localStorage.getItem('onboarding-progress')
    
    if (savedProgress) {
      try {
        const { step, data, integrations, bullets } = JSON.parse(savedProgress)
        
        // Only restore if it's not the final success step (step 3)
        // If user reached success but onboarding wasn't completed, they should start over
        if (step !== 3) {
          setCurrentStep(step || 0)
          setFormData(prev => ({ ...prev, ...data }))
          setConnectedIntegrations(new Set(integrations || []))
          setIntegrationBullets(bullets || {})
        } else {
          // User reached success step but onboarding wasn't completed, start over
          localStorage.removeItem('onboarding-progress')
          // currentStep is already 0 from initialization, no need to set again
        }
      } catch (err) {
        localStorage.removeItem('onboarding-progress')
        // currentStep is already 0 from initialization, no need to set again
      }
    }
  }, [clearPreviousProgress])

  // Save progress to localStorage whenever state changes (debounced)
  useEffect(() => {
    // Don't save if we're on the success step (step 3) as onboarding is complete
    if (currentStep !== 3) {
      saveProgressToLocalStorage(currentStep, formData, connectedIntegrations, integrationBullets)
    }
  }, [currentStep, formData, connectedIntegrations, integrationBullets, saveProgressToLocalStorage])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Generate initial reflection content based on role/level
  const generateInitialReflection = useCallback(() => {
    const effectiveRole = formData.role === 'other' ? formData.customRole : formData.role
    const effectiveLevel = formData.level === 'other' ? formData.customLevel : formData.level
    const tip = effectiveLevel && LEVEL_TIPS[effectiveLevel as keyof typeof LEVEL_TIPS] 
      ? LEVEL_TIPS[effectiveLevel as keyof typeof LEVEL_TIPS] 
      : ''
    
    // Combine bullets from all connected integrations
    const allBullets = Object.values(integrationBullets).flat()
    
    return `## Done

${allBullets.map(bullet => `- ${bullet}`).join('\n')}

## Next

- 

## Notes

${tip ? `💡 Tip for ${effectiveLevel}-level ${effectiveRole}: ${tip}` : ''}
`
  }, [formData.level, formData.role, formData.customLevel, formData.customRole, integrationBullets])

  // Mock integration connection for demo
  const connectIntegration = useCallback(async (integrationType: string) => {
    setIsConnecting(integrationType)
    setError(null)
    
    // Optimistically update UI - add integration immediately
    const tempBullets = getMockIntegrationBullets(integrationType)
    setIntegrationBullets(prev => ({
      ...prev,
      [integrationType]: tempBullets
    }))
    setConnectedIntegrations(prev => new Set([...Array.from(prev), integrationType]))
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real implementation, this would be an actual API call
      // If the call fails, we would revert the optimistic update
      
    } catch (err) {
      // Revert optimistic update on error
      setIntegrationBullets(prev => {
        const updated = { ...prev }
        delete updated[integrationType]
        return updated
      })
      setConnectedIntegrations(prev => {
        const updated = new Set(prev)
        updated.delete(integrationType)
        return updated
      })
      setError('Failed to connect integration. Please try again.')
    } finally {
      setIsConnecting(null)
    }
  }, [])

  // Handle step navigation
  const handleNext = useCallback(async () => {
    if (currentStep === 0) {
      // Require both role and level with enhanced validation
      const effectiveRole = formData.role === 'other' ? sanitizeRoleInput(formData.customRole) : formData.role
      const effectiveLevel = formData.level === 'other' ? sanitizeRoleInput(formData.customLevel) : formData.level
      
      if (!effectiveRole || (formData.role === 'other' && !validateRoleInput(formData.customRole))) {
        setError('Please enter a valid role (2-100 characters, letters, numbers, spaces, hyphens only)')
        return
      }
      
      if (!effectiveLevel || (formData.level === 'other' && !validateRoleInput(formData.customLevel))) {
        setError('Please enter a valid level (2-100 characters, letters, numbers, spaces, hyphens only)')
        return
      }
      
      // Save profile immediately after step 1 to validate early
      setLoadingState({ isLoading: true, operation: 'saving-profile', message: 'Saving your profile...' })
      setError(null)
      
      try {
        const profileResponse = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            jobTitle: effectiveRole,
            seniorityLevel: effectiveLevel,
          }),
        })
        
        if (!profileResponse.ok) {
          await handleApiError(profileResponse, 'Update profile')
        }
        
        // Success - move to next step
        setError(null)
        setCurrentStep(1)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to save profile. Please try again.')
        }
        return
      } finally {
        setLoadingState({ isLoading: false })
      }
      return
    }
    
    if (currentStep === 1 && connectedIntegrations.size === 0) {
      setError('Please connect at least one integration')
      return
    }
    
    setError(null)
    setCurrentStep(prev => Math.min(prev + 1, 2))
  }, [currentStep, formData, connectedIntegrations, handleApiError])

  const handleBack = useCallback(() => {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // Save reflection and complete onboarding
  const handleSave = useCallback(async () => {
    setLoadingState({ isLoading: true, operation: 'creating-snippet', message: 'Creating your first reflection...' })
    setError(null)
    
    try {
      // Profile was already saved in step 1, so we just need the values for the snippet
      const effectiveRole = formData.role === 'other' ? formData.customRole : formData.role
      const effectiveLevel = formData.level === 'other' ? formData.customLevel : formData.level
      
      // Create first snippet
      const currentWeek = getCurrentWeekNumber()
      const year = new Date().getFullYear()
      const { startDate, endDate } = getWeekDates(currentWeek, year)
      
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          weekNumber: currentWeek,
          year: year,
          content: formData.reflectionContent || `## Done\n\n${Object.values(integrationBullets).flat().map(bullet => `- ${bullet}`).join('\n')}\n\n## Next\n\n- \n\n## Notes\n\n${effectiveLevel && LEVEL_TIPS[effectiveLevel as keyof typeof LEVEL_TIPS] ? `💡 Tip for ${effectiveLevel}-level ${effectiveRole}: ${LEVEL_TIPS[effectiveLevel as keyof typeof LEVEL_TIPS]}` : ''}`,
        }),
      })
      
      if (!response.ok) {
        await handleApiError(response, 'Save reflection')
      }
      
      // Update loading state for completion
      setLoadingState({ isLoading: true, operation: 'completing-onboarding', message: 'Finishing setup...' })
      
      // Mark onboarding as complete
      const onboardingResponse = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ completed: true }),
      })
      
      if (!onboardingResponse.ok) {
        await handleApiError(onboardingResponse, 'Complete onboarding')
      }
      
      // Clear saved progress since onboarding is complete
      localStorage.removeItem('onboarding-progress')
      
      // Notify parent component that onboarding is complete
      if (onOnboardingComplete) {
        onOnboardingComplete()
      }
      
      // Move to success step
      setCurrentStep(3)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save. Please try again.')
      }
      console.error('Save error:', err)
    } finally {
      setLoadingState({ isLoading: false })
    }
  }, [formData, integrationBullets, handleApiError, onOnboardingComplete])

  // Update reflection content when we reach step 3
  useEffect(() => {
    if (currentStep === 2 && !formData.reflectionContent) {
      const effectiveRole = formData.role === 'other' ? formData.customRole : formData.role
      const effectiveLevel = formData.level === 'other' ? formData.customLevel : formData.level
      const allBullets = Object.values(integrationBullets).flat()
      const tip = effectiveLevel && LEVEL_TIPS[effectiveLevel as keyof typeof LEVEL_TIPS] 
        ? `💡 Tip for ${effectiveLevel}-level ${effectiveRole}: ${LEVEL_TIPS[effectiveLevel as keyof typeof LEVEL_TIPS]}` 
        : ''
      const content = `## Done\n\n${allBullets.map(bullet => `- ${bullet}`).join('\n')}\n\n## Next\n\n- \n\n## Notes\n\n${tip}`
      
      setFormData(prev => ({
        ...prev,
        reflectionContent: content,
      }))
    }
  }, [currentStep, formData.reflectionContent, formData.level, formData.role, formData.customLevel, formData.customRole, integrationBullets])

  const handleGoToDashboard = useCallback(() => {
    // Set loading state immediately for instant feedback
    setLoadingState({ 
      isLoading: true, 
      operation: 'completing-onboarding', 
      message: 'Taking you to your dashboard...' 
    })
    
    // Use replace instead of push to avoid back navigation to onboarding
    // This makes navigation feel faster and more intentional
    router.replace('/dashboard')
  }, [router])

  const steps = [
    {
      title: 'Tell us about your role',
      subtitle: 'We match your highlights to your career ladder so suggestions stay relevant.',
      content: (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3" id="role-group-label">
              What&apos;s your role? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4" role="radiogroup" aria-labelledby="role-group-label">
              {ROLES.filter(role => role.value !== 'other').map(role => (
                <button
                  key={role.value}
                  onClick={() => setFormData(prev => ({ ...prev, role: role.value, customRole: '' }))}
                  className={`p-4 rounded-lg border-2 transition-all focus:ring-2 focus:ring-accent-500 focus:outline-none ${
                    formData.role === role.value
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="radio"
                  aria-checked={formData.role === role.value}
                  aria-labelledby={`role-${role.value}-label`}
                >
                  <span id={`role-${role.value}-label`}>{role.label}</span>
                </button>
              ))}
            </div>
            
            {/* Custom role text field */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="role"
                  checked={formData.role === 'other'}
                  onChange={() => setFormData(prev => ({ ...prev, role: 'other' }))}
                  className="text-accent-500 focus:ring-accent-500"
                />
                <span className="text-sm font-medium text-gray-700">Other:</span>
              </label>
              <input
                type="text"
                value={formData.role === 'other' ? formData.customRole : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  role: 'other', 
                  customRole: sanitizeRoleInput(e.target.value)
                }))}
                placeholder="Enter your role (e.g., Solutions Architect, DevOps)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:bg-gray-50"
                disabled={formData.role !== 'other'}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3" id="level-group-label">
              What&apos;s your level? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4" role="radiogroup" aria-labelledby="level-group-label">
              {LEVELS.filter(level => level.value !== 'other').map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData(prev => ({ ...prev, level: level.value, customLevel: '' }))}
                  className={`p-3 rounded-lg border-2 transition-all focus:ring-2 focus:ring-accent-500 focus:outline-none ${
                    formData.level === level.value
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="radio"
                  aria-checked={formData.level === level.value}
                  aria-labelledby={`level-${level.value}-label`}
                >
                  <span id={`level-${level.value}-label`}>{level.label}</span>
                </button>
              ))}
            </div>
            
            {/* Custom level text field */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="level"
                  checked={formData.level === 'other'}
                  onChange={() => setFormData(prev => ({ ...prev, level: 'other' }))}
                  className="text-accent-500 focus:ring-accent-500"
                />
                <span className="text-sm font-medium text-gray-700">Other:</span>
              </label>
              <input
                type="text" 
                value={formData.level === 'other' ? formData.customLevel : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  level: 'other', 
                  customLevel: sanitizeRoleInput(e.target.value)
                }))}
                placeholder="Enter your level (e.g., Lead, Principal Consultant)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent disabled:bg-gray-50"
                disabled={formData.level !== 'other'}
              />
            </div>
          </div>

          {/* Career ladder information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <svg className="flex-shrink-0 w-6 h-6 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  💡 Get more personalized insights
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Upload your company&apos;s career ladder document to get insights tailored to your specific promotion criteria and growth expectations.
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  <strong>Don&apos;t have it handy?</strong> No worries! You can upload it later in Settings to enhance your reflections.
                </p>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                  onClick={() => {
                    // Show notification instead of alert
                    setNotification('Career ladder upload will be available in Settings after onboarding!')
                    setTimeout(() => setNotification(null), 3000)
                  }}
                >
                  Learn more about career ladder uploads →
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Connect an integration',
      subtitle: 'Pick one to start. Real bullets from your work will appear instantly.',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INTEGRATIONS.map(integration => (
            <div
              key={integration.id}
              className={`p-6 rounded-lg border-2 transition-all ${
                connectedIntegrations.has(integration.id)
                  ? 'border-accent-500 bg-accent-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`text-${integration.color}-600 mb-4`}>
                {integration.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {integration.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {integration.description}
              </p>
              <button
                onClick={() => {
                  if (!connectedIntegrations.has(integration.id)) {
                    connectIntegration(integration.id)
                  }
                }}
                disabled={isConnecting !== null}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  connectedIntegrations.has(integration.id)
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
{isConnecting === integration.id ? (
                  <LoadingSpinner size="sm" />
                ) : connectedIntegrations.has(integration.id) ? (
                  '✓ Connected'  
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Review your first reflection',
      subtitle: `Nice work! ${formData.level ? `Two of these show cross-team work—great for a ${formData.level}-level ${formData.role}.` : ''}`,
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <textarea
              value={formData.reflectionContent}
              onChange={(e) => setFormData(prev => ({ ...prev, reflectionContent: e.target.value }))}
              className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder="Your weekly reflection..."
            />
          </div>
          <p className="text-sm text-gray-600">
            Feel free to edit, add, or remove any bullets. You can star the best ones or add manual highlights.
          </p>
        </div>
      ),
    },
    {
      title: '🎉 Welcome to AdvanceWeekly!',
      subtitle: 'Your first reflection is saved. Here\'s how to make the most of your weekly practice.',
      content: (
        <div className="space-y-6">
          {/* Success message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-green-600 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Your first reflection is saved!</h3>
                <p className="text-green-700 mt-1">
                  We&apos;ll use this to help you track your growth and prepare for performance reviews.
                </p>
              </div>
            </div>
          </div>

          {/* Calendar recommendation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Set up your reflection habit</h3>
            
            <p className="text-gray-600 mb-4">
              The most successful users block 15 minutes every Friday afternoon for their weekly reflection.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Pro tip: Add a recurring calendar event
              </p>
              <p className="text-sm text-blue-700">
                &quot;Friday Reflection ✍️&quot; - Every Friday at 4:30 PM
              </p>
            </div>
            <button
              onClick={() => {
                setNotification('Calendar integration coming soon!')
                setTimeout(() => setNotification(null), 3000)
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Add to Calendar
            </button>
          </div>

          {/* Next steps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 What happens next?</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="text-accent-500 mr-2">•</span>
                <span>Add reflections each week to build your performance story</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-500 mr-2">•</span>
                <span>Your connected integrations will automatically pull in context</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-500 mr-2">•</span>
                <span>Generate AI-powered assessments when you&apos;re ready for reviews</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Logo variant="horizontal" width={120} priority />
            
            {/* Progress */}
            <div className="flex justify-center items-center space-x-2 mt-6">
              {steps.map((_, index) => (
                <React.Fragment key={index}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                      index < currentStep
                        ? 'bg-green-600 text-white'
                        : index === currentStep
                        ? 'bg-accent-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 ${
                        index < currentStep ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Current Step */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 mb-6">
              {steps[currentStep].subtitle}
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {notification && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                {notification}
              </div>
            )}
            
            <ErrorBoundary
              fallback={
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <div className="text-red-500 text-4xl mb-3">⚠️</div>
                  <h3 className="text-red-800 font-semibold mb-2">Step Error</h3>
                  <p className="text-red-600 mb-4">
                    Something went wrong with this onboarding step. Please try refreshing the page or contact support if the issue persists.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              }
              onError={(error, errorInfo) => {
                console.error('Onboarding step error:', {
                  error: error.message,
                  stack: error.stack,
                  currentStep,
                  stepName: steps[currentStep]?.title || 'Unknown step',
                  componentStack: errorInfo.componentStack,
                  timestamp: new Date().toISOString()
                })
              }}
            >
              {steps[currentStep].content}
            </ErrorBoundary>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            {currentStep < 3 ? (
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            ) : (
              <div /> // Empty div for spacing
            )}
            
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                disabled={loadingState.isLoading}
                className="btn-accent px-8 py-3 rounded-pill font-semibold shadow-elevation-1 disabled:opacity-50"
              >
                {loadingState.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>{loadingState.message}</span>
                  </div>
                ) : (
                  'Continue →'
                )}
              </button>
            ) : currentStep === 2 ? (
              <button
                onClick={handleSave}
                disabled={loadingState.isLoading}
                className="btn-accent px-8 py-3 rounded-pill font-semibold shadow-elevation-1 disabled:opacity-50"
                aria-describedby={loadingState.isLoading ? "save-progress" : undefined}
              >
                {loadingState.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>{loadingState.message}</span>
                  </div>
                ) : (
                  'Save Reflection'
                )}
              </button>
            ) : (
              <button
                onClick={handleGoToDashboard}
                disabled={loadingState.isLoading}
                className="btn-accent px-8 py-3 rounded-pill font-semibold shadow-elevation-1 disabled:opacity-50"
                aria-describedby={loadingState.isLoading ? "dashboard-navigation" : undefined}
              >
                {loadingState.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Taking you to dashboard...</span>
                  </div>
                ) : (
                  'Go to Dashboard →'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

