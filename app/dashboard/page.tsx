'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { AuthenticatedApp } from '../AuthenticatedApp'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If not authenticated, redirect to mock-signin
    if (status === 'loading') {
      console.log('⏳ Dashboard - Waiting for session to load...')
      return // Wait for session to load
    }
    
    if (!session) {
      console.log('🔄 Dashboard - No session found, redirecting to mock-signin')
      // Add a small delay to handle potential race conditions
      setTimeout(() => {
        router.push('/mock-signin')
      }, 100)
    } else {
      console.log('✅ Dashboard - Session found:', session.user?.name)
    }
  }, [session, status, router])

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // If no session, return null (redirect will happen in useEffect)
  if (!session) {
    return null
  }

  // User is authenticated, show the main app
  return <AuthenticatedApp />
}