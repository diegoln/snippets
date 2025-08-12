import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
    let userId: string | null = null
    
    // First, always try JWT tokens (works for dev, staging, and as fallback)
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'development'
    })
    
    // Check if this is a staging mock user (staging_1, staging_2, etc.)
    const isStagingUser = token?.sub?.startsWith('staging_')
    
    if (process.env.NODE_ENV === 'development' || isStagingUser) {
      // Development or staging mock users: use JWT tokens directly
      userId = token?.sub || null
    } else if (process.env.NODE_ENV === 'production') {
      // Production with real users: try database sessions first
      const cookieHeader = request.headers.get('cookie')
      const sessionToken = extractSessionToken(cookieHeader)
      
      if (sessionToken) {
        try {
          // Look up session in database
          const session = await prisma.session.findUnique({
            where: { sessionToken },
            include: { user: true }
          })
          
          if (session && session.expires > new Date()) {
            userId = session.userId
          }
        } catch (dbError) {
          console.log('🔍 Database session lookup failed:', dbError)
        }
      }
      
      // Fallback to JWT if database session fails
      if (!userId) {
        userId = token?.sub || null
      }
    }
    
    // Debug logging for troubleshooting
    if (process.env.NODE_ENV === 'production' || isStagingUser) {
      console.log(`🔍 Auth Debug - URL: ${request.url}`)
      console.log(`🔍 Auth Debug - Method: ${request.method}`)
      console.log(`🔍 Auth Debug - User ID: ${userId || 'none'}`)
      console.log(`🔍 Auth Debug - Is Staging User: ${isStagingUser}`)
      console.log(`🔍 Auth Debug - Token Sub: ${token?.sub || 'none'}`)
      console.log(`🔍 Auth Debug - Session token found: ${!!extractSessionToken(request.headers.get('cookie'))}`)
    }
    
    return userId
  } catch (error) {
    console.error('Error extracting user from session:', error)
    return null
  }
}

/**
 * Extract session token from cookie header
 */
function extractSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  
  // Look for next-auth.session-token or __Secure-next-auth.session-token
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)(?:__Secure-|__Host-)?next-auth\.session-token=([^;]+)/)
  return sessionMatch ? decodeURIComponent(sessionMatch[1]) : null
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