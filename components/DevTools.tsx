'use client'

import { useEffect } from 'react'
import { setDevSession } from '../lib/dev-auth'

/**
 * Development Tools Component - Updated 2025-01-01
 * 
 * This component provides quick access to development utilities
 * Only visible in development mode to help with testing auth flows
 * Uses NextAuth-based authentication, not localStorage sessions
 */

export function DevTools() {
  // Initialize dev session on component mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setDevSession()
    }
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const clearSession = () => {
    // Clear all auth-related data
    localStorage.removeItem('dev-session')
    localStorage.removeItem('onboarding-progress')
    // Clear all user onboarding flags
    for (let i = 1; i <= 3; i++) {
      localStorage.removeItem(`user_${i}_onboarded`)
    }
    window.location.href = '/'
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
      // Ensure dev session is set for authentication
      setDevSession()
      
      // Clear onboarding progress from localStorage
      localStorage.removeItem('onboarding-progress')
      
      // Reset onboarding status in database via API
      const response = await fetch('/api/user/onboarding', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        credentials: 'same-origin',
      })
      
      if (response.ok) {
        const data = await response.json()
        const confirmRedirect = confirm('Onboarding reset successfully! Would you like to go to the onboarding wizard now?')
        if (confirmRedirect) {
          window.location.href = '/onboarding-wizard'
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to reset onboarding: ${error.error}`)
      }
    } catch (err) {
      alert('Failed to reset onboarding. Check console for details.')
    }
  }

  const goToOnboarding = () => {
    window.location.href = '/onboarding-wizard'
  }

  const goToDashboard = () => {
    // The dashboard is the root page when authenticated and onboarded
    // Set flags to ensure we bypass onboarding
    localStorage.setItem('onboarding-just-completed', 'true')
    localStorage.setItem('onboarding-completed-timestamp', Date.now().toString())
    window.location.href = '/'
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200 z-50" style={{ width: '200px' }}>
      <p className="text-xs font-semibold text-gray-600 mb-2">Dev Tools</p>
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
      </div>
    </div>
  )
}