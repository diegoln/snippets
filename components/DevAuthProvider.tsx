'use client'

/**
 * Development Authentication Provider
 * 
 * This component provides a mock authentication system for local development.
 * It manages user state using localStorage and provides auth-like functionality
 * without requiring real OAuth setup.
 * 
 * Features:
 * - Mock user data with realistic profiles
 * - localStorage-based session persistence
 * - Sign in/out functionality that mimics real authentication
 * - Context-based state management for easy access throughout the app
 * 
 * This is only used in development mode. Production uses NextAuth with real OAuth.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

/**
 * User interface matching the structure expected by the application
 * This mirrors the user object structure from NextAuth in production
 */
interface User {
  id: string
  name: string
  email: string
  image: string
}

/**
 * Context type definition for the development authentication provider
 * Provides the same interface as production auth for consistency
 */
interface DevAuthContextType {
  user: User | null
  loading: boolean
  signIn: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

const DevAuthContext = createContext<DevAuthContextType | undefined>(undefined)

/**
 * Development authentication provider component
 * 
 * @param children - Child components that need access to auth state
 * @returns JSX element wrapping children with auth context
 */
export function DevAuthProvider({ children }: { children: ReactNode }) {
  // Initialize user state from localStorage if available
  // This ensures session persistence across page reloads
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const sessionData = localStorage.getItem('dev-session')
        return sessionData ? JSON.parse(sessionData) : null
      } catch {
        // If localStorage is corrupted or unavailable, start with no user
        return null
      }
    }
    return null
  })
  // No loading state needed for localStorage-based auth
  // Real auth providers typically have loading states for API calls
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Just to keep the checkSession function available for other uses
    // but we don't need to call it since we initialize from localStorage above
  }, [])

  // Mock user data for development testing
  // These represent different user personas with realistic profile information
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

  // Remove checkSession since we handle it in the initial state

  /**
   * Mock sign-in function that simulates user authentication
   * 
   * @param userId - ID of the mock user to sign in as
   */
  const signIn = async (userId: string) => {
    try {
      const user = mockUsers.find(u => u.id === userId)
      if (user && typeof window !== 'undefined') {
        // Store user data in localStorage for session persistence
        localStorage.setItem('dev-session', JSON.stringify(user))
        setUser(user)
        // Redirect to onboarding just like real OAuth would
        window.location.href = '/onboarding'
      }
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  /**
   * Mock sign-out function that clears user session
   */
  const signOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        // Clear localStorage session and reset user state
        localStorage.removeItem('dev-session')
        setUser(null)
        // Redirect back to landing page
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <DevAuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </DevAuthContext.Provider>
  )
}

/**
 * Hook to access the development authentication context
 * 
 * @returns DevAuthContextType with user state and auth functions
 * @throws Error if used outside of DevAuthProvider
 */
export function useDevAuth() {
  const context = useContext(DevAuthContext)
  if (context === undefined) {
    throw new Error('useDevAuth must be used within a DevAuthProvider')
  }
  return context
}