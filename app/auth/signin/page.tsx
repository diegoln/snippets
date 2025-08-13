'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { getClientEnvironmentMode } from '../../../lib/environment'

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
  const [envMode, setEnvMode] = useState<'development' | 'staging' | 'production'>('production')
  
  useEffect(() => {
    // Check multiple sources to determine if this is staging
    const currentPath = window.location.pathname
    const currentOrigin = window.location.origin
    const referrer = document.referrer
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    
    // More robust staging detection with multiple fallbacks:
    // 1. PRIORITY: Check callbackUrl for /staging (most reliable from NextAuth)
    // 2. Check referrer for /staging (works when navigating from staging pages)
    // 3. Check current path for /staging (fallback, though middleware rewrites this)
    // 4. Check origin for staging subdomain (additional safety check)
    // 5. Check if current URL has staging context
    
    // Handle URL-encoded callback URLs (e.g., %2Fstaging becomes /staging)
    const decodedCallbackUrl = decodeURIComponent(callbackUrl)
    const callbackHasStaging = callbackUrl.includes('/staging') || decodedCallbackUrl.includes('/staging')
    const referrerHasStaging = referrer.includes('/staging') 
    const pathHasStaging = currentPath.startsWith('/staging')
    const originHasStaging = currentOrigin.includes('staging')
    const urlHasStaging = window.location.href.includes('/staging')
    
    // CRITICAL: Prioritize callbackUrl check as NextAuth preserves the full callback URL
    const isStaging = callbackHasStaging || referrerHasStaging || pathHasStaging || originHasStaging || urlHasStaging
    
    // CRITICAL: If we detect staging, NEVER use Google OAuth
    const currentEnvMode = getClientEnvironmentMode()
    setEnvMode(currentEnvMode)
    const isProduction = currentEnvMode === 'production' && !isStaging
    const isDevelopment = currentEnvMode === 'development'
    
    // Enhanced logging for debugging staging detection issues (only in non-production)
    if (!isProduction) {
      console.log('🔍 SignIn Environment Detection:', {
      currentPath,
      referrer: referrer || '(empty)',
      callbackUrl,
      isStaging,
      isProduction, 
      isDevelopment,
      nodeEnv: currentEnvMode,
      checks: {
        callbackHasStaging,
        referrerHasStaging, 
        pathHasStaging,
        originHasStaging,
        urlHasStaging
      },
      // Show which check triggered staging detection
      stagingTrigger: callbackHasStaging ? 'callbackUrl' : 
                      referrerHasStaging ? 'referrer' :
                      pathHasStaging ? 'path' : 
                      originHasStaging ? 'origin' : 
                      urlHasStaging ? 'url' : 'none'
      })
    }
    
    // STAGING: Always use mock auth, never Google OAuth
    if (isStaging) {
      console.log('🎭 STAGING environment detected - using mock auth')
      // IMPORTANT: Use /mock-signin (not /staging/mock-signin) since middleware rewrites paths
      // But preserve the staging callback URL so we go back to staging after auth
      const stagingCallbackUrl = callbackUrl.includes('/staging') ? callbackUrl : '/staging'
      const targetUrl = `/mock-signin?callbackUrl=${encodeURIComponent(stagingCallbackUrl)}`
      console.log('Redirecting to mock signin with staging callback:', targetUrl)
      window.location.href = targetUrl
      return // Exit early to prevent any other logic
    } else if (isDevelopment) {
      // DEVELOPMENT: Use mock auth without /staging prefix
      if (currentEnvMode === 'development') {
        console.log('🔧 Development environment - using mock auth')
      }
      const targetUrl = `/mock-signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      if (currentEnvMode === 'development') {
        console.log('Redirecting to mock signin:', targetUrl)
      }
      window.location.href = targetUrl
      return // Exit early
    } else if (isProduction) {
      // PRODUCTION (non-staging): Use Google OAuth
      console.log('🔐 Production environment - using Google OAuth')
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
          {envMode === 'development' && (
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <div>Path: {typeof window !== 'undefined' ? window.location.pathname : 'unknown'}</div>
              <div>Environment: {envMode}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}