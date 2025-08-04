/**
 * Mock Users Configuration - Single Source of Truth
 * 
 * This file defines all mock users for development environment.
 * Both authentication and UI components should import from here.
 */

export interface MockUser {
  id: string
  name: string
  email: string
  image: string
  role: string
}

/**
 * Development mock users - Single source of truth
 */
export const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    name: 'Jack Thompson',
    email: 'jack@company.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Software Engineer - Identity Platform'
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

/**
 * Get mock user by ID
 */
export function getMockUserById(id: string): MockUser | null {
  return MOCK_USERS.find(user => user.id === id) || null
}

/**
 * Get all mock users
 */
export function getAllMockUsers(): MockUser[] {
  return MOCK_USERS
}

/**
 * Development environment check
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development'
}