/**
 * Mock Users Configuration - Single Source of Truth
 * 
 * This file defines all mock users for development and staging environments.
 * Both authentication and UI components should import from here.
 */

import { getEnvironmentMode, generateUserId } from './environment'

export interface MockUser {
  id: string
  name: string
  email: string
  image: string
  role: string
}

/**
 * Base mock user data (without environment prefixes)
 */
const BASE_MOCK_USERS: Omit<MockUser, 'id'>[] = [
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
 * Generate environment-specific mock users with appropriate ID prefixes
 */
export function getMockUsers(): MockUser[] {
  const envMode = getEnvironmentMode()
  
  return BASE_MOCK_USERS.map((user, index) => {
    const baseId = (index + 1).toString()
    
    return {
      id: generateUserId(baseId),
      name: user.name,
      email: envMode === 'staging' ? user.email.replace('@', '+staging@') : user.email,
      image: user.image,
      role: user.role
    }
  })
}

/**
 * Legacy export for backward compatibility
 */
export const MOCK_USERS: MockUser[] = getMockUsers()

/**
 * Get mock user by ID (environment-aware)
 */
export function getMockUserById(id: string): MockUser | null {
  const users = getMockUsers()
  return users.find(user => user.id === id) || null
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