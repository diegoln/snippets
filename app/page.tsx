/**
 * Root Page Component - Unified Authentication Entry Point
 * 
 * This component handles the complete authentication flow in a single location:
 * - Landing page for unauthenticated users (with Google OAuth)
 * - Onboarding flow for new users
 * - Main application for authenticated users
 * 
 * Features:
 * - Single-screen experience with no page flashes
 * - Environment-aware authentication (mock for dev, real OAuth for production)
 * - Seamless onboarding flow for new users
 * - Session persistence and management
 */

'use client'

// Force dynamic rendering to avoid build-time database issues
export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import dynamicImport from 'next/dynamic'
import { LandingPage } from '../components/LandingPage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AuthenticatedApp } from './AuthenticatedApp'

// Dynamically import onboarding wizard only (it's rarely used)
const OnboardingWizard = dynamicImport(() => import('./onboarding-wizard/page'), {
  ssr: false
})

interface UserProfile {
  onboardingCompleted: boolean
}

/**
 * Main application root component that handles ALL authentication states
 * in a single location to prevent page flashes and multiple navigations
 */
export default function Home() {
  const { data: session, status } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState(false)

  console.log('🏠 Root page - Session status:', status, 'Session:', session)

  // Fetch user profile when authenticated to determine next step
  useEffect(() => {
    if (status === 'authenticated' && session && !userProfile && !isLoadingProfile) {
      setIsLoadingProfile(true)
      setProfileError(false)
      
      console.log('📊 Fetching user profile for onboarding check...')
      
      fetch('/api/user/profile')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Profile fetch failed: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          console.log('✅ User profile loaded:', { onboardingCompleted: data.onboardingCompleted })
          setUserProfile(data)
        })
        .catch(error => {
          console.error('❌ Failed to fetch user profile:', error)
          setProfileError(true)
        })
        .finally(() => {
          setIsLoadingProfile(false)
        })
    }
  }, [status, session, userProfile, isLoadingProfile])

  // Show loading while checking authentication or fetching profile
  if (status === 'loading' || (status === 'authenticated' && session && (isLoadingProfile || (!userProfile && !profileError)))) {
    console.log('⏳ Root page - Loading...')
    
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <LoadingSpinner size="lg" />
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Loading<span className="animate-pulse">...</span>
            </h2>
          </div>
        </div>
      </div>
    )
  }

  // Handle profile fetch error
  if (profileError) {
    console.log('❌ Profile error, retrying...')
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Unable to load your profile. Please check your connection.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Authenticated user - show appropriate component based on onboarding status
  if (status === 'authenticated' && session && userProfile) {
    if (!userProfile.onboardingCompleted) {
      console.log('📝 User needs onboarding, showing wizard')
      return <OnboardingWizard />
    }
    
    console.log('✅ User is fully set up, showing main app')
    return <AuthenticatedApp />
  }

  // Unauthenticated user - show landing page
  console.log('🔐 Root page - No session, showing landing page')
  return <LandingPage />
}
