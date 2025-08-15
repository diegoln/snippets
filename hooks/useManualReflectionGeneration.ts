/**
 * Hook for manual reflection generation
 * Allows users to trigger reflection generation on-demand
 */

import { useState, useCallback } from 'react'
import { AsyncOperationType, AsyncOperationStatus } from '../types/async-operations'

interface UseManualReflectionGenerationReturn {
  isGenerating: boolean
  error: string | null
  generateReflection: (options?: {
    weekStart?: Date
    weekEnd?: Date
    includeIntegrations?: string[]
    includePreviousContext?: boolean
  }) => Promise<{ operationId: string } | null>
}

export function useManualReflectionGeneration(): UseManualReflectionGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Generate reflection manually
   */
  const generateReflection = useCallback(async (options: {
    weekStart?: Date
    weekEnd?: Date
    includeIntegrations?: string[]
    includePreviousContext?: boolean
  } = {}) => {
    try {
      setIsGenerating(true)
      setError(null)

      const response = await fetch('/api/reflections/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: JSON.stringify({
          weekStart: options.weekStart?.toISOString(),
          weekEnd: options.weekEnd?.toISOString(),
          includeIntegrations: options.includeIntegrations || [],
          includePreviousContext: options.includePreviousContext ?? true,
          triggerType: 'manual'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start reflection generation')
      }

      const data = await response.json()
      
      if (data.success) {
        return { operationId: data.operationId }
      } else {
        throw new Error(data.error || 'Failed to start reflection generation')
      }
    } catch (err) {
      console.error('Error generating reflection:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate reflection'
      setError(errorMessage)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    isGenerating,
    error,
    generateReflection
  }
}