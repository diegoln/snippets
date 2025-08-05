/**
 * React hook for tracking async operations
 * 
 * Provides real-time updates on background job progress via polling.
 * Perfect for tracking career plan generation and other long-running tasks.
 */

import { useState, useEffect, useCallback } from 'react'
import { 
  AsyncOperation, 
  AsyncOperationType,
  AsyncOperationStatus 
} from '../types/async-operations'

interface AsyncOperationHookResult {
  operation: AsyncOperation | null
  isLoading: boolean
  isComplete: boolean
  isError: boolean
  progress: number
  error: string | null
  timeRemaining?: number
  refresh: () => Promise<void>
}

export function useAsyncOperation(operationId: string | null): AsyncOperationHookResult {
  const [operation, setOperation] = useState<AsyncOperation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>()

  const fetchOperation = useCallback(async () => {
    if (!operationId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/async-operations/${operationId}`, {
        method: 'GET',
        credentials: 'same-origin'
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Operation not found')
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setOperation(data.operation)
      setTimeRemaining(data.timeRemaining)

    } catch (err) {
      console.error('Error fetching async operation:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch operation status')
    } finally {
      setIsLoading(false)
    }
  }, [operationId])

  // Initial fetch and periodic polling
  useEffect(() => {
    if (!operationId) return

    // Initial fetch
    fetchOperation()

    // Set up polling for active operations
    const pollInterval = setInterval(() => {
      fetchOperation()
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [operationId, fetchOperation])

  // Stop polling when operation is complete
  useEffect(() => {
    if (operation?.status === AsyncOperationStatus.COMPLETED || 
        operation?.status === AsyncOperationStatus.FAILED) {
      // Operation is done, no need to continue polling
      return
    }
  }, [operation?.status])

  const isComplete = operation?.status === AsyncOperationStatus.COMPLETED || 
                    operation?.status === AsyncOperationStatus.FAILED
  const isError = operation?.status === AsyncOperationStatus.FAILED
  const progress = operation?.progress || 0

  return {
    operation,
    isLoading,
    isComplete,
    isError,
    progress,
    error: error || operation?.errorMessage || null,
    timeRemaining,
    refresh: fetchOperation
  }
}

/**
 * Hook for creating and tracking a new async operation
 */
export function useCreateAsyncOperation() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createOperation = useCallback(async (
    operationType: AsyncOperationType,
    inputData: any,
    metadata?: any
  ): Promise<string | null> => {
    try {
      setIsCreating(true)
      setError(null)

      const response = await fetch('/api/async-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          operationType,
          inputData,
          metadata
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.operationId

    } catch (err) {
      console.error('Error creating async operation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create operation')
      return null
    } finally {
      setIsCreating(false)
    }
  }, [])

  return {
    createOperation,
    isCreating,
    error
  }
}

/**
 * Hook for career guidelines generation specifically
 */
export function useCareerGuidelinesGeneration() {
  const { createOperation, isCreating, error: createError } = useCreateAsyncOperation()
  const [operationId, setOperationId] = useState<string | null>(null)
  const asyncOp = useAsyncOperation(operationId)

  const generateCareerGuidelines = useCallback(async (params: {
    role: string,
    level: string,
    companyLadder?: string
  }) => {
    const opId = await createOperation(
      AsyncOperationType.CAREER_PLAN_GENERATION,
      { role: params.role, level: params.level, companyLadder: params.companyLadder }
    )
    
    if (opId) {
      setOperationId(opId)
    }
    
    return opId
  }, [createOperation])

  const reset = useCallback(() => {
    setOperationId(null)
  }, [])

  return {
    generateCareerGuidelines,
    reset,
    operationId,
    isCreating,
    createError,
    ...asyncOp
  }
}