'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Logo } from './Logo'
import { LoadingSpinner } from './LoadingSpinner'
import { getWeekDates } from '@/lib/utils'
import { getCurrentWeekNumber } from '@/lib/week-utils'

// Role and level options
const ROLES = [
  { value: 'engineer', label: 'Engineer' },
  { value: 'designer', label: 'Designer' },
  { value: 'product', label: 'Product Manager' },
  { value: 'data', label: 'Data Scientist' },
]

const LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff' },
  { value: 'principal', label: 'Principal' },
]

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
  level: string
  reflectionContent: string
}

export function OnboardingWizard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [integrationBullets, setIntegrationBullets] = useState<Record<string, string[]>>({})
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState<WizardFormData>({
    role: '',
    level: '',
    reflectionContent: '',
  })

  // Generate initial reflection content based on role/level
  const generateInitialReflection = useCallback(() => {
    const levelTips: Record<string, string> = {
      junior: 'Focus on learning milestones and skill development',
      mid: 'Highlight cross-team collaboration and independent delivery',
      senior: 'Emphasize technical leadership and mentoring',
      staff: 'Show system design and strategic initiatives',
      principal: 'Demonstrate org-wide impact and technical direction',
    }

    const tip = levelTips[formData.level] || ''
    
    // Combine bullets from all connected integrations
    const allBullets = Object.values(integrationBullets).flat()
    
    return `## Done

${allBullets.map(bullet => `- ${bullet}`).join('\n')}

## Next

- 

## Notes

${tip ? `💡 Tip for ${formData.level}-level ${formData.role}: ${tip}` : ''}
`
  }, [formData.level, formData.role, integrationBullets])

  // Mock integration connection for demo
  const connectIntegration = useCallback(async (integrationType: string) => {
    setIsConnecting(integrationType)
    setError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock bullets based on integration type
      const mockBullets: Record<string, string[]> = {
        google_calendar: [
          'Led architecture review meeting for new microservice design',
          'Conducted 3 technical interviews for senior engineering positions',
          'Presented Q4 roadmap to executive team',
          'Mentored junior developers in weekly 1:1 sessions',
        ],
        github: [
          'Merged 12 PRs including critical auth service refactor',
          'Reviewed 28 pull requests across 3 repositories',
          'Implemented new CI/CD pipeline reducing deploy time by 40%',
          'Fixed critical production bug affecting 10k users',
        ],
        jira: [
          'Completed 8 story points in sprint 42',
          'Resolved 3 high-priority bugs in payment system',
          'Delivered user profile feature ahead of schedule',
          'Created technical design docs for upcoming epic',
        ],
      }
      
      setIntegrationBullets(prev => ({
        ...prev,
        [integrationType]: mockBullets[integrationType] || []
      }))
      setConnectedIntegrations(prev => new Set([...prev, integrationType]))
    } catch (err) {
      setError('Failed to connect integration. Please try again.')
    } finally {
      setIsConnecting(null)
    }
  }, [])

  // Handle step navigation
  const handleNext = useCallback(() => {
    if (currentStep === 0 && (!formData.role || !formData.level)) {
      setError('Please select both role and level')
      return
    }
    
    if (currentStep === 1 && connectedIntegrations.size === 0) {
      setError('Please connect at least one integration')
      return
    }
    
    setError(null)
    setCurrentStep(prev => Math.min(prev + 1, 2))
  }, [currentStep, formData, connectedIntegrations])

  const handleBack = useCallback(() => {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  // Save reflection and complete onboarding
  const handleSave = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Save user role/level
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: formData.role,
          seniorityLevel: formData.level,
        }),
      })
      
      // Create first snippet
      const currentWeek = getCurrentWeekNumber()
      const year = new Date().getFullYear()
      const { startDate, endDate } = getWeekDates(currentWeek, year)
      
      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber: currentWeek,
          year: year,
          content: formData.reflectionContent || generateInitialReflection(),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save reflection')
      }
      
      // Mark onboarding as complete
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      
      // Offer calendar block
      if (window.confirm('Would you like to add a weekly "Friday Reflection ✍️" block to your calendar?')) {
        // TODO: Implement calendar block creation
        console.log('Calendar block creation not yet implemented')
      }
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error('Save error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [formData, generateInitialReflection, router])

  // Update reflection content when we reach step 3
  useEffect(() => {
    if (currentStep === 2 && !formData.reflectionContent) {
      setFormData(prev => ({
        ...prev,
        reflectionContent: generateInitialReflection(),
      }))
    }
  }, [currentStep, formData.reflectionContent, generateInitialReflection])

  const steps = [
    {
      title: 'Tell us about your role',
      subtitle: 'We match your highlights to your ladder so suggestions stay relevant.',
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your role?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.role === role.value
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your level?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData(prev => ({ ...prev, level: level.value }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.level === level.value
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {level.label}
                </button>
              ))}
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
  ]

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Logo variant="horizontal" width={160} priority />
            
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
            
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                className="btn-accent px-8 py-3 rounded-pill font-semibold shadow-elevation-1"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="btn-accent px-8 py-3 rounded-pill font-semibold shadow-elevation-1 disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Save Reflection'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

