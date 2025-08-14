'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { setDevSession } from '../lib/dev-auth'
// No longer need these imports since we're doing environment detection directly

/**
 * Development Tools Component - Updated with Staging Support
 * 
 * This component provides quick access to development utilities
 * Visible in development and staging modes for testing auth flows
 * Uses NextAuth-based authentication, not localStorage sessions
 */

export function DevTools() {
  const [envMode, setEnvMode] = useState<'development' | 'staging' | 'production'>('production')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize environment detection and dev session
  useEffect(() => {
    async function initializeEnvironment() {
      const STAGING_HOSTNAME = 'staging.advanceweekly.io'
      const DEVELOPMENT_HOSTNAMES = ['localhost', '127.0.0.1']

      try {
        let detectedEnv: 'development' | 'staging' | null = null
        
        // Client-side check for well-known hostnames
        if (typeof window !== 'undefined') {
          const { hostname } = window.location
          if (hostname === STAGING_HOSTNAME) {
            detectedEnv = 'staging'
          } else if (DEVELOPMENT_HOSTNAMES.includes(hostname)) {
            detectedEnv = 'development'
          }
        }

        if (detectedEnv) {
          setEnvMode(detectedEnv)
          setDevSession()
          return // Skip API call if environment is determined
        }

        // Fallback to API for other environments (e.g., review apps)
        const response = await fetch('/api/environment')
        if (response.ok) {
          const data = await response.json()
          setEnvMode(data.environment)
          if (data.environment === 'staging' || data.environment === 'development') {
            setDevSession()
          }
        } else {
          console.warn(`API call to /api/environment failed with status ${response.status}. Falling back to production mode.`)
          setEnvMode('production')
        }
      } catch (error) {
        console.error('Failed to detect environment:', error)
        // Fallback to production on any network or parsing error
        setEnvMode('production')
      } finally {
        setIsInitialized(true)
      }
    }

    initializeEnvironment()
  }, [])

  // Don't render until we've detected the environment
  if (!isInitialized) {
    return null
  }

  // Only show dev tools in development and staging
  if (envMode !== 'development' && envMode !== 'staging') {
    return null
  }

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
      const redirectUrl = '/'
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
      window.location.href = '/'
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
      if (envMode === 'development') {
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
      if (envMode === 'development') {
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
          window.location.href = envMode === 'staging' ? '/' : '/onboarding-wizard'
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
    if (envMode !== 'staging') {
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
        window.location.href = '/'
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to reset staging data: ${error.error}`)
      }
    } catch (err) {
      alert('Failed to reset staging data. Check console for details.')
    }
  }

  const goToOnboarding = () => {
    window.location.href = envMode === 'staging' ? '/' : '/onboarding-wizard'
  }

  const goToDashboard = () => {
    // The dashboard is the root page when authenticated and onboarded
    // Set flags to ensure we bypass onboarding
    localStorage.setItem('onboarding-just-completed', 'true')
    localStorage.setItem('onboarding-completed-timestamp', Date.now().toString())
    window.location.href = '/'
  }

  const testWeeklyReflection = async () => {
    const confirm = window.confirm(
      'This will trigger the complete weekly reflection automation flow:\n\n' +
      '1. Collect integration data (uses latest mock data)\n' +
      '2. Consolidate into themes and insights\n' +
      '3. Generate reflection draft with AI\n' +
      '4. Save as draft for review\n\n' +
      'Continue?'
    )
    if (!confirm) return

    try {
      // Show loading state
      const button = document.querySelector('[data-test="weekly-reflection"]') as HTMLButtonElement
      if (button) {
        button.disabled = true
        button.textContent = 'Processing...'
      }

      const response = await fetch('/api/jobs/weekly-reflection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(envMode === 'development' ? { 'X-Dev-User-Id': 'dev-user-123' } : {})
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          manual: true,
          includePreviousContext: true,
          includeIntegrations: ['google_calendar'],
          testMode: true // Signal this is a test run using mock data
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Start polling for completion
        const operationId = data.operationId
        let attempts = 0
        const maxAttempts = 30 // 5 minutes max
        
        const poll = async () => {
          attempts++
          const statusResponse = await fetch(`/api/jobs/weekly-reflection?operationId=${operationId}`, {
            credentials: 'same-origin'
          })
          
          if (statusResponse.ok) {
            const status = await statusResponse.json()
            
            if (status.status === 'completed') {
              alert(`✅ Weekly reflection generated successfully!\n\nOperation ID: ${operationId}\n\nCheck the Friday Reflections tab to see your new draft.`)
              
              // Optionally navigate to reflections
              const goToReflections = window.confirm('Would you like to go to the Friday Reflections tab now?')
              if (goToReflections) {
                window.location.href = '/'
              }
              return
            } else if (status.status === 'error') {
              alert(`❌ Weekly reflection generation failed:\n\n${status.errorMessage || 'Unknown error'}`)
              return
            } else if (attempts >= maxAttempts) {
              alert(`⏱️ Weekly reflection is taking longer than expected.\n\nOperation ID: ${operationId}\n\nCheck the Friday Reflections tab later or contact support.`)
              return
            } else {
              // Still processing, continue polling
              setTimeout(poll, 10000) // Poll every 10 seconds
              
              // Update button with progress
              if (button) {
                const progress = status.progress || 0
                button.textContent = `Processing... ${progress}%`
              }
            }
          } else {
            alert('Failed to check reflection status. Please try again.')
            return
          }
        }
        
        // Start polling after a short delay
        setTimeout(poll, 2000)
        
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to start weekly reflection:\n\n${error.error || error.details || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Weekly reflection test error:', err)
      alert('Failed to test weekly reflection. Check console for details.')
    } finally {
      // Reset button state
      const button = document.querySelector('[data-test="weekly-reflection"]') as HTMLButtonElement
      if (button) {
        button.disabled = false
        button.textContent = '📝 Test Reflection'
      }
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-50" style={{ width: '220px' }}>
      <p className="text-xs font-semibold text-gray-600 mb-2">
        Dev Tools {envMode === 'staging' && <span className="text-orange-600">(Staging)</span>}
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
        {/* Testing Tools */}
        <div className="flex gap-2 border-t pt-2">
          <button
            onClick={testWeeklyReflection}
            data-test="weekly-reflection"
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 w-full"
            title="Test complete weekly reflection automation flow"
          >
            📝 Test Reflection
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