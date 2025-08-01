/**
 * User role and level constants for validation and type safety
 */

export const VALID_ROLES = ['engineer', 'designer', 'product', 'data'] as const
export const VALID_LEVELS = ['junior', 'mid', 'senior', 'staff', 'principal'] as const

export type UserRole = typeof VALID_ROLES[number]
export type UserLevel = typeof VALID_LEVELS[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  engineer: 'Engineer',
  designer: 'Designer', 
  product: 'Product Manager',
  data: 'Data Scientist',
}

export const LEVEL_LABELS: Record<UserLevel, string> = {
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  staff: 'Staff',
  principal: 'Principal',
}

export const LEVEL_TIPS: Record<UserLevel, string> = {
  junior: 'Focus on learning milestones and skill development',
  mid: 'Highlight cross-team collaboration and independent delivery',
  senior: 'Emphasize technical leadership and mentoring',
  staff: 'Show system design and strategic initiatives',
  principal: 'Demonstrate org-wide impact and technical direction',
}

/**
 * Validates if a role is valid
 */
export function isValidRole(role: any): role is UserRole {
  return VALID_ROLES.includes(role)
}

/**
 * Validates if a level is valid
 */
export function isValidLevel(level: any): level is UserLevel {
  return VALID_LEVELS.includes(level)
}