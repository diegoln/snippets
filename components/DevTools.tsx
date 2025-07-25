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
    localStorage.removeItem('dev-session')
    window.location.href = '/'
  }

  const viewSession = () => {
    const session = localStorage.getItem('dev-session')
    if (session) {
      console.log('Current session:', JSON.parse(session))
      alert(`Current user: ${JSON.parse(session).name}\nOnboarding completed: ${JSON.parse(session).hasCompletedOnboarding || false}`)
    } else {
      alert('No active session')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-50">
      <p className="text-xs font-semibold text-gray-600 mb-2">Dev Tools</p>
      <div className="flex gap-2">
        <button
          onClick={clearSession}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          title="Clear session and logout"
        >
          Clear Session
        </button>
        <button
          onClick={viewSession}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          title="View current session data"
        >
          View Session
        </button>
      </div>
    </div>
  )
}