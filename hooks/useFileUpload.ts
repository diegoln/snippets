/**
 * Custom Hook for File Upload Logic
 * 
 * Centralized file upload validation and handling to eliminate
 * code duplication and improve maintainability.
 */

import { useCallback } from 'react'
import { FILE_VALIDATION, VALIDATION_MESSAGES } from '../constants/settings'

export interface FileUploadResult {
  file: File | null
  error: string | null
}

export interface UseFileUploadOptions {
  onSuccess?: (file: File) => void
  onError?: (error: string) => void
  onClear?: () => void
}

export const useFileUpload = ({ onSuccess, onError, onClear }: UseFileUploadOptions = {}) => {
  /**
   * Validate uploaded file
   */
  const validateFile = useCallback((file: File): FileUploadResult => {
    // Check file type
    if (!FILE_VALIDATION.ALLOWED_TYPES.includes(file.type as any)) {
      const error = VALIDATION_MESSAGES.INVALID_FILE_TYPE
      onError?.(error)
      return { file: null, error }
    }

    // Check file size
    if (file.size > FILE_VALIDATION.MAX_SIZE) {
      const error = VALIDATION_MESSAGES.FILE_TOO_LARGE
      onError?.(error)
      return { file: null, error }
    }

    // File is valid
    onSuccess?.(file)
    return { file, error: null }
  }, [onSuccess, onError])

  /**
   * Handle file input change event
   */
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): FileUploadResult => {
    const file = event.target.files?.[0] || null
    
    if (!file) {
      onClear?.()
      return { file: null, error: null }
    }

    return validateFile(file)
  }, [validateFile, onClear])

  /**
   * Clear file input
   */
  const clearFile = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    onClear?.()
  }, [onClear])

  /**
   * Format file size for display
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  return {
    handleFileChange,
    validateFile,
    clearFile,
    formatFileSize,
    maxSize: FILE_VALIDATION.MAX_SIZE,
    allowedTypes: FILE_VALIDATION.ALLOWED_TYPES
  }
}