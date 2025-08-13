import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import { getApiEnvironmentMode } from '../../../../lib/api-environment'

// Create singleton PrismaClient instance for connection reuse in serverless environment
const prisma = new PrismaClient()

/**
 * Helper function to check if a user ID is safe for the given environment
 * Centralizes the logic for environment-specific user ID validation
 */
const isSafeMockIdForEnvironment = (id: string, envMode: string): boolean => {
  // Check for production UUID pattern first
  const productionUserPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (productionUserPattern.test(id)) {
    return false;
  }
  
  if (envMode === 'staging') {
    return id.startsWith('staging_');
  }
  
  // envMode is 'development'
  return ['1', '2', '3', '4', '5'].includes(id) ||
         id.startsWith('dev_') ||
         id.startsWith('test_');
}

/**
 * Mock Users API Endpoint - DEVELOPMENT AND STAGING ONLY
 * 
 * This endpoint returns mock users from the database for authentication testing.
 * 
 * SECURITY CRITICAL: This endpoint MUST NEVER expose production user data.
 * Only returns users with specific mock/staging ID prefixes.
 */
export async function GET(request: NextRequest) {
  try {
    const envMode = getApiEnvironmentMode(request)
    
    // SECURITY: Only allow access in development or staging environments
    if (envMode === 'production') {
      console.warn('🚨 SECURITY: Mock users API accessed in production environment - DENIED')
      return NextResponse.json(
        { error: 'Not available in production' },
        { status: 403 }
      )
    }
    
    console.log(`🎭 Mock users API accessed in ${envMode} environment`)
    
    // SECURITY: Only return users with safe ID patterns (never production user IDs)
    let whereClause: Prisma.UserWhereInput
    
    if (envMode === 'staging') {
      // Staging: Only return users with 'staging_' prefix
      whereClause = {
        id: { startsWith: 'staging_' }
      }
    } else {
      // Development: Only return users with numeric IDs (1, 2, 3, etc.) or dev prefixes
      whereClause = {
        OR: [
          { id: { in: ['1', '2', '3', '4', '5'] } }, // Standard dev user IDs
          { id: { startsWith: 'dev_' } },            // Dev prefixed IDs
          { id: { startsWith: 'test_' } }            // Test prefixed IDs
        ]
      }
    }
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        jobTitle: true,
        seniorityLevel: true
      },
      orderBy: {
        id: 'asc'
      }
    })
    
    // SECURITY: Double-check that no production user data is included
    const hasProductionUsers = users.some(user => 
      !isSafeMockIdForEnvironment(user.id, envMode)
    )
    
    if (hasProductionUsers) {
      console.error('🚨 SECURITY BREACH: Production user data detected in mock users response!')
      return NextResponse.json(
        { error: 'Security violation: Production data detected' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Returning ${users.length} safe mock users for ${envMode}`)
    
    // Transform to MockUser format
    const mockUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown User',
      email: user.email,
      image: user.image || '',
      role: user.jobTitle || 'Unknown Role'
    }))
    
    return NextResponse.json(mockUsers)
    
  } catch (error) {
    console.error('❌ Error fetching mock users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// SECURITY: Ensure only GET method is allowed
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}