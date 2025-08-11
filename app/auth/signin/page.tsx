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
    
    const isStaging = currentPath.includes('/staging') || 
                     referrer.includes('/staging') ||
                     callbackUrl.includes('/staging')
    
    const isProduction = process.env.NODE_ENV === 'production' && !isStaging
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    console.log('Dynamic SignIn - Environment detection:', {
      currentPath,
      referrer,
      callbackUrl,
      isStaging,
      isProduction, 
      isDevelopment,
      nodeEnv: process.env.NODE_ENV
    })
    
    // Add a small delay to ensure proper environment detection
    setTimeout(() => {
      if (isProduction) {
        // Production: use Google OAuth
        console.log('🔐 Production environment - using Google OAuth')
        signIn('google', { 
          callbackUrl: callbackUrl,
          redirect: true 
        })
      } else {
        // Development or Staging: use mock auth
        console.log('🔐 Dev/Staging environment - using mock auth')
        const stagingPrefix = isStaging ? '/staging' : ''
        const targetUrl = `${stagingPrefix}/mock-signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
        console.log('Redirecting to:', targetUrl)
        window.location.href = targetUrl
      }
      setIsLoading(false)
    }, 100)
    
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