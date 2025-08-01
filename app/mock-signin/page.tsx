'use client'

/**
 * Mock Sign-In Page for Development
 * 
 * This page provides a development-only interface for testing with multiple users.
 * It integrates with NextAuth's credentials provider to create proper session tokens
 * that work with our authentication utilities.
 */

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Logo } from '../../components/Logo'

const mockUsers = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@example.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Software Engineer'
  },
  {
    id: '2', 
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    role: 'Staff Engineer'
  },
  {
    id: '3',
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Product Designer'
  }
]

export default function MockSignInPage() {
  const [signingIn, setSigningIn] = useState<string | null>(null)

  const handleSignIn = async (userId: string) => {
    try {
      setSigningIn(userId)
      
      console.log('🔐 Starting sign-in for user:', userId)
      
      // Use redirect: false to control the redirect manually
      const result = await signIn('credentials', {
        userId,
        callbackUrl: '/',
        redirect: false
      })
      
      console.log('🔐 Sign-in result:', result)
      
      if (result?.error) {
        console.error('Sign in error:', result.error)
        setSigningIn(null)
      } else if (result?.ok) {
        console.log('✅ Sign-in successful, redirecting to root...')
        
        // Redirect to root page which will handle the appropriate flow
        window.location.href = '/'
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
              {mockUsers.map((user) => (
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
              ))}
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