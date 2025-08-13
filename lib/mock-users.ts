/**
 * Mock Users Configuration - Single Source of Truth
 * 
 * This file defines all mock users for development and staging environments.
 * Both authentication and UI components should import from here.
 */

import { getEnvironmentMode } from './environment'

export interface MockUser {
  id: string
  name: string
  email: string
  image: string
  role: string
}

/**
 * Base mock user data (without environment prefixes)
 * Exported for reuse in staging initialization scripts
 */
export const BASE_MOCK_USERS: Omit<MockUser, 'id'>[] = [
  {
    name: 'Jack Thompson',
    email: 'jack@company.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Software Engineer - Identity Platform'
  },
  {
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    role: 'Staff Engineer'
  },
  {
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Product Designer'
  }
]

/**
 * Generate mock users for a specific environment (helper function)
 */
function generateMockUsersForEnvironment(envMode: 'development' | 'staging' | 'production'): MockUser[] {
  return BASE_MOCK_USERS.map((user, index) => {
    const baseId = (index + 1).toString()
    const prefix = envMode === 'staging' ? 'staging_' : ''
    
    return {
      id: `${prefix}${baseId}`,
      name: user.name,
      email: envMode === 'staging' ? user.email.replace('@', '+staging@') : user.email,
      image: user.image,
      role: user.role
    }
  })
}

/**
 * Generate environment-specific mock users with appropriate ID prefixes
 */
export function getMockUsers(): MockUser[] {
  const envMode = getEnvironmentMode()
  return generateMockUsersForEnvironment(envMode)
}

/**
 * Legacy export for backward compatibility
 */
export const MOCK_USERS: MockUser[] = getMockUsers()

/**
 * Get mock user by ID (environment-aware)
 * 
 * CRITICAL: This function handles both environment-prefixed IDs (staging_1) 
 * and base IDs (1) for compatibility across different contexts.
 */
export function getMockUserById(id: string): MockUser | null {
  // First try exact match with environment-aware users
  const users = getMockUsers()
  let user = users.find(user => user.id === id)
  
  if (user) {
    return user
  }
  
  // FALLBACK: If staging ID not found, try all possible prefixed versions
  // This handles cases where server-side environment detection differs
  if (!id.includes('_')) {
    // PERFORMANCE: Generate users for all environments only once
    const allEnvUsers = [
      ...generateMockUsersForEnvironment('development'),
      ...generateMockUsersForEnvironment('staging'),
      // Note: production and development users are identical, so we can skip duplicate generation
    ]
    
    // Base ID provided, try with all possible prefixes
    const possibleIds = [
      id,                    // Base ID (development)
      `staging_${id}`,       // Staging prefixed ID
    ]
    
    for (const possibleId of possibleIds) {
      user = allEnvUsers.find(u => u.id === possibleId)
      if (user) {
        return user
      }
    }
  }
  
  return null
}

/**
 * Get all mock users (environment-aware)
 */
export function getAllMockUsers(): MockUser[] {
  return getMockUsers()
}

/**
 * Development environment check
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development'
}