'use client'

/**
 * Development Tools Component
 * 
 * This component provides quick access to development utilities
 * Only visible in development mode to help with testing auth flows
 */

export function DevTools() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const clearSession = () => {
    // Clear all auth-related data
    localStorage.removeItem('dev-session')
    // Clear all user onboarding flags
    for (let i = 1; i <= 3; i++) {
      localStorage.removeItem(`user_${i}_onboarded`)
    }
    window.location.href = '/'
  }

  const viewSession = () => {
    const session = localStorage.getItem('dev-session')
    if (session) {
      const user = JSON.parse(session)
      const onboardingFlag = localStorage.getItem(`user_${user.id}_onboarded`)
      console.log('Current session:', user)
      alert(`Current user: ${user.name}\nUser ID: ${user.id}\nOnboarding completed: ${user.hasCompletedOnboarding || false}\nOnboarding flag: ${onboardingFlag || 'not set'}`)
    } else {
      alert('No active session')
    }
  }

  const resetOnboarding = () => {
    const session = localStorage.getItem('dev-session')
    if (session) {
      const user = JSON.parse(session)
      // Remove onboarding flag
      localStorage.removeItem(`user_${user.id}_onboarded`)
      // Update user object
      const updatedUser = { ...user, hasCompletedOnboarding: false }
      localStorage.setItem('dev-session', JSON.stringify(updatedUser))
      alert(`Onboarding reset for ${user.name}`)
    } else {
      alert('No active session')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-50">
      <p className="text-xs font-semibold text-gray-600 mb-2">Dev Tools</p>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={clearSession}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            title="Clear all sessions and logout"
          >
            Clear All
          </button>
          <button
            onClick={viewSession}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            title="View current session data"
          >
            View Session
          </button>
        </div>
        <button
          onClick={resetOnboarding}
          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 w-full"
          title="Reset onboarding for current user"
        >
          Reset Onboarding
        </button>
      </div>
    </div>
  )
}