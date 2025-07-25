'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '../../components/Logo'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const mockUsers = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@example.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '2', 
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b9f2d30c?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '3',
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  }
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('Onboarding page loaded')
    // Check localStorage for user session
    try {
      const sessionData = localStorage.getItem('dev-session')
      if (sessionData) {
        const user = JSON.parse(sessionData)
        console.log('Found user in localStorage:', user)
        setCurrentUser(user)
      } else {
        console.log('No user session found, redirecting to mock-signin')
        router.push('/mock-signin')
      }
    } catch (error) {
      console.error('Error loading user session:', error)
      router.push('/mock-signin')
    }
    setIsLoading(false)
  }, [router])

  const handleContinue = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  const steps = [
    {
      title: `Welcome to AdvanceWeekly, ${currentUser?.name?.split(' ')[0]}!`,
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-lg text-secondary leading-relaxed mb-8">
            You're now part of a community of professionals who are taking control of their career growth. 
            Let's get you set up with everything you need to start tracking your weekly progress.
          </p>
        </div>
      )
    },
    {
      title: 'Track Your Weekly Wins',
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg text-secondary leading-relaxed mb-8">
            Every week, capture what you accomplished, what you learned, and what you're planning next. 
            This becomes your professional journal and the foundation for performance reviews.
          </p>
          <div className="bg-white rounded-lg p-6 text-left max-w-md mx-auto shadow-elevation-1">
            <h4 className="font-semibold text-primary-600 mb-2">Example Weekly Snippet:</h4>
            <div className="text-sm text-secondary space-y-2">
              <div><strong>Done:</strong> Launched new user dashboard</div>
              <div><strong>Next:</strong> Optimize loading performance</div>
              <div><strong>Notes:</strong> Team collaboration was excellent</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'AI-Powered Performance Reviews',
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-lg text-secondary leading-relaxed mb-8">
            When performance review time comes, our AI will analyze your weekly snippets and generate 
            compelling summaries that highlight your impact and growth. No more scrambling to remember what you did!
          </p>
          <div className="bg-primary-100/50 rounded-lg p-4 text-sm text-primary-600 max-w-md mx-auto">
            <strong>💡 Pro Tip:</strong> Configure your job title and career ladder in Settings to get 
            personalized performance review content that aligns with your role.
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Logo variant="horizontal" width={180} priority />
            </div>
            
            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2 mb-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-advance ${
                    index <= currentStep ? 'bg-accent-500' : 'bg-neutral-600/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Current Step */}
          <div className="card p-8 mb-8">
            <h1 className="text-2xl font-bold text-primary-600 mb-6 text-center">
              {steps[currentStep].title}
            </h1>
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-secondary hover:text-primary-600 transition-advance"
            >
              Skip setup
            </button>
            
            <div className="flex space-x-4">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 border border-neutral-600/30 text-secondary rounded-pill hover:bg-neutral-100 transition-advance"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleContinue}
                className="btn-accent px-8 py-3 rounded-pill font-semibold shadow-elevation-1"
              >
                {currentStep < 2 ? 'Continue' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}