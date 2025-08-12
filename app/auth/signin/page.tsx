'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

/**
 * Dynamic Sign-In Page
 * 
 * Routes to appropriate authentication method based on environment:
 * - Staging (/staging/*): Uses mock authentication
 * - Production: Uses Google OAuth
 * - Development: Uses mock authentication
 */
export default function SignInPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Check multiple sources to determine if this is staging
    const currentPath = window.location.pathname
    const currentOrigin = window.location.origin
    const referrer = document.referrer
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    
    // More robust staging detection:
    // CRITICAL: Check if referrer includes /staging (most reliable indicator)
    // The middleware rewrites /staging paths, but the referrer still contains the original path
    const isStaging = referrer.includes('/staging') ||
                     callbackUrl.includes('/staging') ||
                     currentPath.startsWith('/staging') ||
                     currentOrigin.includes('staging')
    
    // CRITICAL: If we detect staging, NEVER use Google OAuth
    const isProduction = process.env.NODE_ENV === 'production' && !isStaging
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Only log in development to avoid noise and potential info leaks
    if (process.env.NODE_ENV === 'development') {
      console.log('Dynamic SignIn - Environment detection:', {
        currentPath,
        referrer,
        callbackUrl,
        isStaging,
        isProduction, 
        isDevelopment,
        nodeEnv: process.env.NODE_ENV,
        checks: {
          callbackHasStaging: callbackUrl.includes('/staging'),
          referrerHasStaging: referrer.includes('/staging'),
          pathStartsWithStaging: currentPath.startsWith('/staging'),
          originHasStaging: currentOrigin.includes('staging')
        }
      })
    }
    
    // STAGING: Always use mock auth, never Google OAuth
    if (isStaging) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎭 STAGING environment detected - using mock auth')
      }
      // IMPORTANT: Use /mock-signin (not /staging/mock-signin) since middleware rewrites paths
      // But preserve the staging callback URL so we go back to staging after auth
      const stagingCallbackUrl = callbackUrl.includes('/staging') ? callbackUrl : '/staging'
      const targetUrl = `/mock-signin?callbackUrl=${encodeURIComponent(stagingCallbackUrl)}`
      if (process.env.NODE_ENV === 'development') {
        console.log('Redirecting to mock signin with staging callback:', targetUrl)
      }
      window.location.href = targetUrl
      return // Exit early to prevent any other logic
    } else if (isDevelopment) {
      // DEVELOPMENT: Use mock auth without /staging prefix
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development environment - using mock auth')
      }
      const targetUrl = `/mock-signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      if (process.env.NODE_ENV === 'development') {
        console.log('Redirecting to mock signin:', targetUrl)
      }
      window.location.href = targetUrl
      return // Exit early
    } else if (isProduction) {
      // PRODUCTION (non-staging): Use Google OAuth
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Production environment - using Google OAuth')
      }
      signIn('google', { 
        callbackUrl: callbackUrl,
        redirect: true 
      })
    }
    setIsLoading(false)
    
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Signing you in...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLoading 
              ? 'Detecting environment and routing to appropriate sign-in method'
              : 'Redirecting...'
            }
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <div>Path: {typeof window !== 'undefined' ? window.location.pathname : 'unknown'}</div>
              <div>Environment: {process.env.NODE_ENV}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}