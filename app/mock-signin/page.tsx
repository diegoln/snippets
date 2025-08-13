'use client'

/**
 * Mock Sign-In Page for Development
 * 
 * This page provides a development-only interface for testing with multiple users.
 * It integrates with NextAuth's credentials provider to create proper session tokens
 * that work with our authentication utilities.
 */

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Logo } from '../../components/Logo'
import { type MockUser } from '../../lib/mock-users'
import { getClientEnvironmentMode, isStaging } from '../../lib/environment'

export default function MockSignInPage() {
  const [signingIn, setSigningIn] = useState<string | null>(null)
  const [mockUsers, setMockUsers] = useState<MockUser[]>([])
  const searchParams = useSearchParams()
  
  // Get callback URL from query params, default to home
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  // Load actual users from database instead of generating static users
  useEffect(() => {
    const loadUsersFromDatabase = async () => {
      try {
        console.log('🎭 Loading users from database for environment:', getClientEnvironmentMode())
        
        // Fetch users from a new API endpoint that will return actual database users
        const response = await fetch('/api/auth/mock-users', {
          method: 'GET',
          credentials: 'same-origin'
        })
        
        if (response.ok) {
          const users = await response.json()
          console.log('✅ Loaded users from database:', users)
          setMockUsers(users)
        } else {
          console.error('❌ Failed to load users from database:', response.status)
          // Fallback to empty array - user will see no options
          setMockUsers([])
        }
      } catch (error) {
        console.error('❌ Error loading users from database:', error)
        setMockUsers([])
      }
    }
    
    loadUsersFromDatabase()
  }, [])

  const handleSignIn = async (userId: string) => {
    try {
      setSigningIn(userId)
      
      console.log('🔐 Starting mock sign-in for user:', userId)
      console.log('🔗 Callback URL:', callbackUrl)
      
      // Use redirect: false to control the redirect manually
      const result = await signIn('mock-auth', {
        userId,
        callbackUrl,
        redirect: false
      })
      
      console.log('🔐 Sign-in result:', result)
      
      if (result?.error) {
        console.error('Sign in error:', result.error)
        setSigningIn(null)
      } else if (result?.ok) {
        console.log('✅ Sign-in successful, redirecting to:', callbackUrl)
        
        // Redirect to the specified callback URL
        window.location.href = callbackUrl
      } else {
        console.log('⚠️ Unexpected sign-in result:', result)
        setSigningIn(null)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setSigningIn(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="card p-8 text-center">
            <div className="flex justify-center mb-8">
              <Logo variant="horizontal" width={200} priority />
            </div>
            
            <h1 className="text-2xl font-bold text-primary-600 mb-2">
              Choose Mock User
            </h1>
            <p className="text-secondary mb-8">
              Select a user to sign in (Development Mode)
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>🚀 Development Mode:</strong> Choose any user to sign in. In production, this will use real Google OAuth.
              </p>
            </div>

            <div className="space-y-4">
              {mockUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading mock users...</p>
                </div>
              ) : (
                mockUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSignIn(user.id)}
                  disabled={signingIn !== null}
                  className={`w-full p-4 border-2 rounded-lg transition-all duration-200 flex items-center space-x-4 ${
                    signingIn === user.id
                      ? 'border-blue-500 bg-blue-50 cursor-not-allowed'
                      : signingIn !== null
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                    <p className="text-gray-500 text-xs mt-1">{user.role}</p>
                  </div>
                  {signingIn === user.id ? (
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  ) : (
                    <div className="text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-600/20">
              <p className="text-sm text-secondary">
                Want to see the landing page?{' '}
                <a
                  href="/"
                  className="text-accent-500 hover:text-accent-600 font-medium transition-advance"
                >
                  Go back
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}