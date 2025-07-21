/**
 * Tooltip Component
 * 
 * A reusable tooltip component that provides contextual help information
 * with proper accessibility support and responsive positioning.
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Props for the Tooltip component
 */
interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * Tooltip Component
 * 
 * Provides contextual help information on hover or focus with proper
 * accessibility features including ARIA labels and keyboard support.
 */
export function Tooltip({ 
  content, 
  children, 
  position = 'top', 
  className = '' 
}: TooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState(position)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  /**
   * Calculate optimal tooltip position based on viewport space
   */
  const calculatePosition = useCallback((): void => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let newPosition = position

    // Check if tooltip would overflow viewport and adjust position
    switch (position) {
      case 'top':
        if (triggerRect.top < tooltipRect.height + 10) {
          newPosition = 'bottom'
        }
        break
      case 'bottom':
        if (triggerRect.bottom + tooltipRect.height + 10 > viewport.height) {
          newPosition = 'top'
        }
        break
      case 'left':
        if (triggerRect.left < tooltipRect.width + 10) {
          newPosition = 'right'
        }
        break
      case 'right':
        if (triggerRect.right + tooltipRect.width + 10 > viewport.width) {
          newPosition = 'left'
        }
        break
    }

    setActualPosition(newPosition)
  }, [position])

  /**
   * Show tooltip with position calculation
   */
  const showTooltip = useCallback((): void => {
    setIsVisible(true)
    // Calculate position after tooltip is rendered
    setTimeout(calculatePosition, 0)
  }, [calculatePosition])

  /**
   * Hide tooltip
   */
  const hideTooltip = useCallback((): void => {
    setIsVisible(false)
  }, [])

  /**
   * Handle keyboard interactions
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent): void => {
    if (event.key === 'Escape' && isVisible) {
      hideTooltip()
    }
  }, [isVisible, hideTooltip])

  /**
   * Position classes for different tooltip positions
   */
  const getPositionClasses = useCallback((): string => {
    const baseClasses = 'absolute z-50'
    
    switch (actualPosition) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`
      default:
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`
    }
  }, [actualPosition])

  /**
   * Arrow classes for different positions
   */
  const getArrowClasses = useCallback((): string => {
    const baseArrow = 'absolute w-2 h-2 bg-gray-900 transform rotate-45'
    
    switch (actualPosition) {
      case 'top':
        return `${baseArrow} top-full left-1/2 -translate-x-1/2 -mt-1`
      case 'bottom':
        return `${baseArrow} bottom-full left-1/2 -translate-x-1/2 -mb-1`
      case 'left':
        return `${baseArrow} left-full top-1/2 -translate-y-1/2 -ml-1`
      case 'right':
        return `${baseArrow} right-full top-1/2 -translate-y-1/2 -mr-1`
      default:
        return `${baseArrow} top-full left-1/2 -translate-x-1/2 -mt-1`
    }
  }, [actualPosition])

  // Add resize listener to recalculate position
  useEffect(() => {
    if (!isVisible) return

    const handleResize = (): void => {
      calculatePosition()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isVisible, calculatePosition])

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Element */}
      <div 
        className="cursor-help"
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
        aria-label="Show help information"
      >
        {children}
      </div>

      {/* Tooltip Content */}
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className={getPositionClasses()}
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 w-48 max-w-48 shadow-lg">
            {content}
            {/* Arrow */}
            <div className={getArrowClasses()} />
          </div>
        </div>
      )}

      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}