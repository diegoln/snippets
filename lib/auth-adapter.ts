import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

// Reuse global Prisma instance to prevent connection exhaustion
declare global {
  // eslint-disable-next-line no-var
  var __globalPrisma: PrismaClient | undefined
}

const prisma = globalThis.__globalPrisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalThis.__globalPrisma = prisma
}

/**
 * Safe database adapter creation with graceful fallbacks
 * 
 * This function handles database connectivity issues by:
 * 1. Always using JWT sessions in development
 * 2. Attempting to create PrismaAdapter in production
 * 3. Falling back to JWT sessions if database connection fails
 * 
 * This prevents "Try signing in with a different account" errors
 * that occur when NextAuth can't establish database sessions.
 */
export function createSafeAdapter() {
  if (process.env.NODE_ENV === 'development') {
    return undefined // Always use JWT in development
  }
  
  try {
    // Create PrismaAdapter but let NextAuth handle connection failures
    return PrismaAdapter(prisma)
  } catch (error) {
    console.error('Failed to create PrismaAdapter, using JWT sessions:', error)
    return undefined
  }
}

/**
 * Get the appropriate session strategy based on adapter availability
 */
export function getSessionStrategy(adapter: any) {
  return (process.env.NODE_ENV === 'development' || !adapter) ? 'jwt' : 'database'
}