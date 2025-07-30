/**
 * Integrations Component
 * 
 * Allows users to connect their Google Calendar and other third-party services
 * to automatically extract meeting context for Friday reflections and career tracking.
 */

'use client'

import React, { useState, useEffect } from 'react'

interface Integration {
  id: string
  type: string
  isActive: boolean
  lastSyncAt?: string
  createdAt: string
}

interface ApiErrorResponse {
  error: string
  details?: any
}

export const Integrations = (): JSX.Element => {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Constants
  const FETCH_TIMEOUT_MS = 10000 // 10 seconds
  const RETRY_DELAY_MS = 2000 // 2 seconds

  // Fetch user's current integrations
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let abortController: AbortController | null = null
    let mounted = true

    const fetchIntegrations = async () => {
      // Reset error state
      setError(null)
      
      // Create abort controller for this request
      abortController = new AbortController()
      
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.error('Integration fetch timeout')
          setError('Request timed out. Please try again.')
          setIsLoading(false)
          abortController?.abort()
        }
      }, FETCH_TIMEOUT_MS)

      try {
        const response = await fetch('/api/integrations', {
          credentials: 'include', // Include cookies for auth
          signal: abortController.signal
        })
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        if (!mounted) return
        
        if (!response.ok) {
          const errorMsg = response.status === 401 
            ? 'Authentication required. Please sign in again.'
            : `Failed to load integrations (${response.status})`
          
          console.error('Failed to fetch integrations:', response.status, response.statusText)
          setError(errorMsg)
          setIsLoading(false)
          return
        }
        
        const data = await response.json()
        if (mounted) {
          setIntegrations(data.integrations || [])
          setError(null)
        }
      } catch (error: any) {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        if (!mounted) return
        
        // Don't show error for aborted requests
        if (error.name === 'AbortError') {
          return
        }
        
        console.error('Failed to fetch integrations:', error)
        setError('Failed to load integrations. Please check your connection.')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchIntegrations()

    // Cleanup function
    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (abortController) {
        abortController.abort()
      }
    }
  }, [])

  const handleConnectCalendar = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'google_calendar'
        })
      })

      if (response.ok) {
        // Refresh integrations list
        const refreshResponse = await fetch('/api/integrations')
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          setIntegrations(refreshData.integrations || [])
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to connect calendar:', errorData.error)
        // In a real app, show user-friendly error message
        alert(`Failed to connect calendar: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error connecting calendar:', error)
      alert('Failed to connect calendar. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
    // Trigger re-fetch by updating a dependency
    window.location.reload() // Simple solution for now
  }

  const calendarIntegration = integrations.find(i => i.type === 'google_calendar')

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-secondary">Loading integrations...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-900 mb-2">Unable to Load Integrations</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-2">Connect Your Calendar</h2>
        <p className="text-secondary mb-6">
          Connect your Google Calendar to automatically extract meeting context for your Friday reflections. 
          This helps our AI understand your career progress and collaboration patterns.
        </p>

        {!calendarIntegration ? (
          <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-primary-900 mb-2">Google Calendar</h3>
                <p className="text-secondary mb-4">
                  Connect your Google Calendar to automatically extract:
                </p>
                <ul className="text-sm text-secondary space-y-1 mb-6">
                  <li>• Meeting titles and descriptions</li>
                  <li>• 1:1 discussions for career development</li>
                  <li>• Project meetings and technical discussions</li>
                  <li>• Stakeholder interactions and presentations</li>
                </ul>
                <button
                  onClick={handleConnectCalendar}
                  disabled={isConnecting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Connect Google Calendar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-900 mb-2">Google Calendar Connected</h3>
                <p className="text-green-700 mb-4">
                  Your calendar is connected and ready to provide meeting context for your Friday reflections.
                </p>
                <div className="text-sm text-green-600 space-y-1">
                  <p>Connected: {new Date(calendarIntegration.createdAt).toLocaleDateString()}</p>
                  {calendarIntegration.lastSyncAt && (
                    <p>Last sync: {new Date(calendarIntegration.lastSyncAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
        <h3 className="text-lg font-medium text-primary-900 mb-2">How It Works</h3>
        <div className="space-y-4 text-secondary">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
            <p>We securely access your calendar events for the current week</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <p>Extract meeting context, including titles, descriptions, and attendee information</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <p>AI analyzes your meetings to understand career progress and collaboration patterns</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
            <p>Context is used to improve Friday reflection suggestions and performance assessments</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Privacy & Security</h3>
        <ul className="text-blue-700 space-y-2 text-sm">
          <li>• We only access basic meeting information (titles, times, attendees)</li>
          <li>• Meeting content and private details are never stored</li>
          <li>• You can disconnect at any time from your account settings</li>
          <li>• All data is encrypted and processed securely</li>
        </ul>
      </div>
    </div>
  )
}