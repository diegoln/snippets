/**
 * Logout Icon Component
 * 
 * Reusable logout/sign out icon for authentication buttons
 * Provides consistent styling and accessibility across the app
 */

import React from 'react'

interface LogoutIconProps {
  className?: string
  'aria-hidden'?: boolean
}

export const LogoutIcon: React.FC<LogoutIconProps> = ({ 
  className = "w-5 h-5", 
  'aria-hidden': ariaHidden = true 
}) => (
  <svg 
    className={className}
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden={ariaHidden}
    role="img"
  >
    <title>Sign out</title>
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
    />
  </svg>
)