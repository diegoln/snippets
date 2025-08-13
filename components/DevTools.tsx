'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { setDevSession } from '../lib/dev-auth'
import { 
  shouldShowDevTools, 
  getClientEnvironmentMode, 
  isStaging, 
  isDevelopment,
  isDevLike 
} from '../lib/environment'

/**
 * Development Tools Component - Updated with Staging Support
 * 
 * This component provides quick access to development utilities
 * Visible in development and staging modes for testing auth flows
 * Uses NextAuth-based authentication, not localStorage sessions
 */

export function DevTools() {
  // Initialize dev session on component mount for dev-like environments
  useEffect(() => {
    if (shouldShowDevTools()) {
      setDevSession()
    }
  }, [])

  if (!shouldShowDevTools()) {
    return null
  }

  const envMode = getClientEnvironmentMode()
  
  // Debug logging for environment detection comparison
  console.log('🛠️ DevTools Environment Debug:', {
    envMode,
    isStaging: isStaging(),
    getClientEnvironmentMode: getClientEnvironmentMode(),
    processEnvEnvironmentMode: process.env.ENVIRONMENT_MODE,
    processEnvNodeEnv: process.env.NODE_ENV
  })

  const clearSession = async () => {
    try {
      // Clear all auth-related localStorage data
      localStorage.removeItem('dev-session')
      localStorage.removeItem('onboarding-progress')
      localStorage.removeItem('onboarding-just-completed')
      localStorage.removeItem('onboarding-completed-timestamp')
      // Clear all user onboarding flags
      for (let i = 1; i <= 5; i++) {
        localStorage.removeItem(`user_${i}_onboarded`)
      }
      
      // Clear NextAuth session (important for staging JWT cookies)
      console.log('🔄 Clearing NextAuth session...')
      const redirectUrl = isStaging() ? '/staging' : '/'
      await signOut({ 
        redirect: false,
        callbackUrl: redirectUrl
      })
      
      // Force reload to ensure clean state
      console.log('🔄 Reloading page for clean state...')
      window.location.href = redirectUrl
    } catch (error) {
      console.error('Error clearing session:', error)
      // Fallback: force reload anyway
      window.location.href = isStaging() ? '/staging' : '/'
    }
  }

  const viewSession = async () => {
    try {
      // Check current user via API
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'same-origin',
      })
      
      if (response.ok) {
        const userData = await response.json()
        alert(`Current user: ${userData.name || 'Unknown'}\nUser ID: ${userData.id}\nEmail: ${userData.email}\nJob Title: ${userData.jobTitle || 'Not set'}\nSeniority Level: ${userData.seniorityLevel || 'Not set'}\nOnboarding completed: ${userData.onboardingCompleted ? 'Yes' : 'No'}\nCompleted at: ${userData.onboardingCompletedAt || 'N/A'}`)
      } else if (response.status === 401) {
        alert('Not authenticated - please sign in first')
      } else {
        alert('Failed to fetch user session')
      }
    } catch (err) {
      alert('Error fetching session - check console for details')
    }
  }

  const resetOnboarding = async () => {
    try {
      // Only set dev session in development (not in staging)
      if (isDevelopment()) {
        setDevSession()
      }
      
      // Clear onboarding progress from localStorage
      localStorage.removeItem('onboarding-progress')
      localStorage.removeItem('onboarding-just-completed')
      localStorage.removeItem('onboarding-completed-timestamp')
      
      // Reset onboarding status in database via API
      const headers: HeadersInit = { 
        'Content-Type': 'application/json'
      }
      
      // Only add dev header in development
      if (isDevelopment()) {
        headers['X-Dev-User-Id'] = 'dev-user-123'
      }
      
      const response = await fetch('/api/user/onboarding', {
        method: 'DELETE',
        headers,
        credentials: 'include', // Important for staging cookies
      })
      
      if (response.ok) {
        const data = await response.json()
        const confirmRedirect = confirm('Onboarding reset successfully! Would you like to go to the onboarding wizard now?')
        if (confirmRedirect) {
          window.location.href = isStaging() ? '/staging' : '/onboarding-wizard'
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to reset onboarding: ${error.error}`)
      }
    } catch (err) {
      alert('Failed to reset onboarding. Check console for details.')
    }
  }

  const resetStagingData = async () => {
    if (!isStaging()) {
      alert('This function is only available in staging environment')
      return
    }
    
    const confirm = window.confirm('This will reset ALL staging data including users, reflections, and integrations. Are you sure?')
    if (!confirm) return
    
    try {
      const response = await fetch('/api/staging/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })
      
      if (response.ok) {
        alert('Staging data reset successfully! Redirecting to staging home...')
        window.location.href = '/staging'
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to reset staging data: ${error.error}`)
      }
    } catch (err) {
      alert('Failed to reset staging data. Check console for details.')
    }
  }

  const goToOnboarding = () => {
    window.location.href = isStaging() ? '/staging' : '/onboarding-wizard'
  }

  const goToDashboard = () => {
    // The dashboard is the root page when authenticated and onboarded
    // Set flags to ensure we bypass onboarding
    localStorage.setItem('onboarding-just-completed', 'true')
    localStorage.setItem('onboarding-completed-timestamp', Date.now().toString())
    window.location.href = isStaging() ? '/staging' : '/'
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-50" style={{ width: '220px' }}>
      <p className="text-xs font-semibold text-gray-600 mb-2">
        Dev Tools {isStaging() && <span className="text-orange-600">(Staging)</span>}
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={clearSession}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            title="Clear all sessions and logout"
          >
            Clear All
          </button>
          <button
            onClick={viewSession}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            title="View current session data"
          >
            Session
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetOnboarding}
            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 flex-1"
            title="Reset onboarding for current user"
          >
            Reset
          </button>
          <button
            onClick={goToOnboarding}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex-1"
            title="Go to onboarding wizard"
          >
            Onboarding
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToDashboard}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 w-full"
            title="Go to dashboard"
          >
            Dashboard
          </button>
        </div>
        {envMode === 'staging' && (
          <div className="flex gap-2 border-t pt-2">
            <button
              onClick={resetStagingData}
              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 w-full"
              title="Reset all staging data (users, reflections, integrations)"
            >
              🔄 Reset Staging
            </button>
          </div>
        )}
      </div>
    </div>
  )
}