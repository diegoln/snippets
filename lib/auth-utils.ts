import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Authentication utilities for user context and session management
 * 
 * Provides unified functions to extract authenticated user information
 * from requests, supporting both production OAuth and development mock auth.
 */

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

/**
 * Extract authenticated user from NextAuth session
 * 
 * In development, uses JWT tokens with mock user data
 * In production, uses database sessions with real OAuth data
 * 
 * @param request - Next.js request object
 * @returns User ID if authenticated, null if not
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Use NextAuth JWT token approach for App Router API routes
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'development'
    })
    
    if (!token?.sub) {
      return null
    }
    
    return token.sub
  } catch (error) {
    console.error('Error extracting user from token:', error)
    return null
  }
}

/**
 * Extract full authenticated user from NextAuth session
 * 
 * @param request - Next.js request object
 * @returns Full user object if authenticated, null if not
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'development'
    })
    
    if (!token?.sub) {
      return null
    }

    return {
      id: token.sub,
      email: token.email!,
      name: token.name || null,
      image: token.picture || null
    }
  } catch (error) {
    console.error('Error extracting user from token:', error)
    return null
  }
}

/**
 * Middleware function to require authentication
 * 
 * Returns the user ID if authenticated, throws if not
 * Use this in API routes that require authentication
 * 
 * @param request - Next.js request object
 * @returns User ID
 * @throws Error if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const userId = await getUserIdFromRequest(request)
  
  if (!userId) {
    throw new Error('Authentication required')
  }
  
  return userId
}

/**
 * Check if request is from an authenticated user
 * 
 * @param request - Next.js request object
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const userId = await getUserIdFromRequest(request)
  return userId !== null
}