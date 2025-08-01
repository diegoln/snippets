/**
 * SafeImage Component
 * 
 * Secure image component with error handling and fallbacks
 * Prevents XSS and provides consistent loading states
 */

'use client'

import React, { useState, useCallback } from 'react'

interface SafeImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallbackSrc?: string
  onError?: () => void
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc = '/default-avatar.png',
  onError
}) => {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc)
  const [hasError, setHasError] = useState(false)

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!hasError && currentSrc !== fallbackSrc) {
      setHasError(true)
      setCurrentSrc(fallbackSrc)
      onError?.()
    }
  }, [hasError, currentSrc, fallbackSrc, onError])

  // Validate URL to prevent XSS
  const isValidImageUrl = useCallback((url: string) => {
    try {
      const parsedUrl = new URL(url, window.location.origin)
      // Allow data URLs, relative URLs, and trusted domains
      return parsedUrl.protocol === 'https:' || 
             parsedUrl.protocol === 'http:' || 
             parsedUrl.protocol === 'data:' ||
             url.startsWith('/')
    } catch {
      return false
    }
  }, [])

  const safeSrc = currentSrc && isValidImageUrl(currentSrc) ? currentSrc : fallbackSrc

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={safeSrc}
      alt={alt}
      className={`${className} object-cover`}
      onError={handleError}
      loading="lazy"
    />
  )
}