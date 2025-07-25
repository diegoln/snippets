'use client'

import { useState } from 'react'
import { useDevAuth } from '../../components/DevAuthProvider'
import { Logo } from '../../components/Logo'

const mockUsers = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@example.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '2', 
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b9f2d30c?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '3',
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  }
]

export default function MockSignInPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { signIn } = useDevAuth()

  const handleSignIn = async (userId: string) => {
    console.log('Sign in clicked for user:', userId)
    setIsLoading(userId)
    try {
      // Set user in localStorage first
      const user = mockUsers.find(u => u.id === userId)
      if (user) {
        localStorage.setItem('dev-session', JSON.stringify(user))
        console.log('User stored in localStorage:', user)
        
        // Use a small delay before redirect to ensure localStorage is set
        setTimeout(() => {
          console.log('Redirecting to onboarding...')
          window.location.href = `/onboarding?user=${userId}`
        }, 100)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(null)
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
                  disabled={!!isLoading}
                  className={`w-full p-4 border-2 rounded-lg transition-all duration-200 flex items-center space-x-4 ${
                    isLoading === user.id
                      ? 'border-blue-500 bg-blue-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                  }`}
                >
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                  {isLoading === user.id && (
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
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