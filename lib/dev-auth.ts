/**
 * Development Authentication Helper
 * 
 * Provides simple authentication utilities for development mode
 * to test flows without requiring full OAuth setup.
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create or get a test user for development
 */
export async function ensureDevUser(): Promise<string> {
  const testUser = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      id: 'dev-user-123',
      email: 'dev@example.com',
      name: 'Dev User',
      jobTitle: 'Software Engineer',
      seniorityLevel: 'Senior Software Engineer'
    }
  })
  
  return testUser.id
}

/**
 * Enhanced auth helper that works in development without NextAuth session
 */
export async function getDevUserIdFromRequest(request: NextRequest): Promise<string | null> {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // Check for dev session cookie or header
  const devSession = request.cookies.get('dev-session')?.value
  const devHeader = request.headers.get('x-dev-user-id')
  
  if (devSession === 'active' || devHeader) {
    try {
      return await ensureDevUser()
    } catch (error) {
      console.error('Failed to ensure dev user:', error)
      return null
    }
  }

  return null
}

/**
 * Set dev session cookie for testing
 */
export function setDevSession(): void {
  if (typeof window !== 'undefined') {
    document.cookie = 'dev-session=active; path=/'
  }
}