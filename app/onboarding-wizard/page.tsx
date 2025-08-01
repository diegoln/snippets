'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { OnboardingWizard } from '../../components/OnboardingWizard'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorBoundary } from '../../components/ErrorBoundary'

export default function OnboardingWizardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (status === 'loading') return
    
    if (!session) {
      router.push('/')
      return
    }
    
    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const fetchedUserData = await response.json()
          setUserData(fetchedUserData)
          
          if (fetchedUserData.onboardingCompleted) {
            // User has already completed onboarding, redirect to root
            router.replace('/')
            return
          }
        }
      } catch (error) {
        // Continue to onboarding wizard on error
      } finally {
        setCheckingOnboarding(false)
      }
    }

    checkOnboardingStatus()
  }, [session, status, router])

  if (status === 'loading' || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-secondary mt-4">
            {status === 'loading' ? 'Checking authentication...' : 'Verifying onboarding status...'}
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <ErrorBoundary>
      <OnboardingWizard 
        initialData={userData ? {
          jobTitle: userData.jobTitle,
          seniorityLevel: userData.seniorityLevel
        } : undefined}
        clearPreviousProgress={!!userData && !userData.onboardingCompleted}
        onOnboardingComplete={() => {
          // Update userData when onboarding is completed to prevent clearPreviousProgress from being true
          setUserData(prev => prev ? { ...prev, onboardingCompleted: true } : prev)
        }}
      />
    </ErrorBoundary>
  )
}