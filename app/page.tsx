/**
 * Root Page Component - Authentication Entry Point
 * 
 * This component handles the authentication flow and directs users to either:
 * - Landing page for unauthenticated users (with Google OAuth)
 * - Main application for authenticated users
 * 
 * Features:
 * - Environment-aware authentication (mock for dev, real OAuth for production)
 * - Seamless onboarding flow for new users
 * - Session persistence and management
 */

'use client'

// Force dynamic rendering to avoid build-time database issues
export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useDevAuth } from '../components/DevAuthProvider'
import { LandingPage } from '../components/LandingPage'
import { AuthenticatedApp } from './AuthenticatedApp'
import { LoadingSpinner } from '../components/LoadingSpinner'

/**
 * Main application root component that handles authentication routing
 * 
 * @returns JSX element for the appropriate page based on auth state
 */
export default function Home() {
  const { data: session, status } = useSession()
  const { user, loading } = useDevAuth()

  // Show loading spinner while checking auth state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // In development, use dev auth; in production, use NextAuth
  const isAuthenticated = process.env.NODE_ENV === 'development' 
    ? !!user 
    : !!session

  // Show landing page for unauthenticated users, main app for authenticated users
  return isAuthenticated ? <AuthenticatedApp /> : <LandingPage />
}

