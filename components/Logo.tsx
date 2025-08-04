/**
 * AdvanceWeekly Logo Component
 * 
 * Implements the brand logo guidelines with proper sizing, variants, and accessibility.
 * Follows the brand assets usage rules defined in the design system.
 */

import React from 'react'
import Image from 'next/image'

export interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon'
  showTagline?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
  dark?: boolean
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  showTagline = false,
  width,
  height,
  className = '',
  priority = false,
  dark = false
}) => {
  // Determine logo file based on variant and settings
  const getLogoSrc = (): string => {
    if (variant === 'icon') {
      return '/brand/06_icon_circle.png'
    }
    
    if (dark) {
      return '/brand/07_logo_horizontal_white.png'
    }
    
    if (variant === 'horizontal') {
      return showTagline ? '/brand/02_logo_horizontal_tagline.png' : '/brand/01_logo_horizontal.png'
    }
    
    if (variant === 'stacked') {
      return showTagline ? '/brand/04_logo_stacked_tagline.png' : '/brand/03_logo_stacked.png'
    }
    
    return '/brand/01_logo_horizontal.png'
  }

  // Calculate dimensions based on variant and minimum sizes
  const getDimensions = () => {
    if (width && height) {
      return { width, height }
    }
    
    if (variant === 'icon') {
      return { width: 32, height: 32 }
    }
    
    if (variant === 'horizontal') {
      const defaultWidth = showTagline ? 180 : 130
      const defaultHeight = showTagline ? 60 : 40
      return { 
        width: width || defaultWidth, 
        height: height || (width ? (width * defaultHeight) / defaultWidth : defaultHeight)
      }
    }
    
    if (variant === 'stacked') {
      const defaultWidth = showTagline ? 120 : 100
      const defaultHeight = showTagline ? 80 : 60
      return { 
        width: width || defaultWidth, 
        height: height || (width ? (width * defaultHeight) / defaultWidth : defaultHeight)
      }
    }
    
    return { width: 130, height: 40 }
  }

  const { width: logoWidth, height: logoHeight } = getDimensions()
  const logoSrc = getLogoSrc()

  // Accessibility and brand compliance
  const altText = showTagline 
    ? 'AdvanceWeekly logo - See beyond the busy.'
    : 'AdvanceWeekly logo'

  return (
    <div 
      className={`logo-container ${className}`}
      style={{ 
        minWidth: variant === 'icon' ? '32px' : '80px',
        display: 'inline-block'
      }}
    >
      <Image
        src={logoSrc}
        alt={altText}
        width={logoWidth}
        height={logoHeight}
        priority={priority}
        className="logo-image"
        style={{
          width: width ? `${logoWidth}px` : '100%',
          height: 'auto',
          maxWidth: '100%',
        }}
      />
    </div>
  )
}

/**
 * Logo Usage Guidelines Component
 * Provides clear spacing requirements for proper logo placement
 */
export const LogoWithClearSpace: React.FC<LogoProps> = (props) => {
  const clearSpaceSize = props.variant === 'icon' ? 8 : 16 // Half arrow height approximation
  
  return (
    <div style={{ padding: `${clearSpaceSize}px` }}>
      <Logo {...props} />
    </div>
  )
}

export default Logo