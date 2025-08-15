/**
 * @jest-environment jsdom
 * 
 * Test suite for useManualReflectionGeneration hook
 * Tests manual reflection generation functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useManualReflectionGeneration } from '../../hooks/useManualReflectionGeneration'

// Mock fetch
global.fetch = jest.fn()

describe('useManualReflectionGeneration', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should start with correct initial state', () => {
      const { result } = renderHook(() => useManualReflectionGeneration())

      expect(result.current.isGenerating).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.generateReflection).toBe('function')
    })
  })

  describe('generateReflection', () => {
    it('should generate reflection successfully', async () => {
      const mockResponse = {
        success: true,
        operationId: 'test-operation-123',
        weekNumber: 42,
        year: 2024,
        estimatedDuration: 120000,
        message: 'Reflection generation started successfully'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const { result } = renderHook(() => useManualReflectionGeneration())

      let generationResult: any

      await act(async () => {
        generationResult = await result.current.generateReflection()
      })

      expect(generationResult).toEqual({ operationId: 'test-operation-123' })
      expect(result.current.error).toBe(null)
      expect(result.current.isGenerating).toBe(false)

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith('/api/reflections/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: JSON.stringify({
          weekStart: undefined,
          weekEnd: undefined,
          includeIntegrations: [],
          includePreviousContext: true,
          triggerType: 'manual'
        })
      })
    })

    it('should generate reflection with custom options', async () => {
      const mockResponse = {
        success: true,
        operationId: 'test-operation-456'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const { result } = renderHook(() => useManualReflectionGeneration())

      const customOptions = {
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        includeIntegrations: ['google_calendar', 'github'],
        includePreviousContext: false
      }

      await act(async () => {
        await result.current.generateReflection(customOptions)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/reflections/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: JSON.stringify({
          weekStart: '2024-01-01T00:00:00.000Z',
          weekEnd: '2024-01-07T00:00:00.000Z',
          includeIntegrations: ['google_calendar', 'github'],
          includePreviousContext: false,
          triggerType: 'manual'
        })
      })
    })

    it('should handle API errors', async () => {
      const errorResponse = {
        success: false,
        error: 'A reflection is already being generated. Please wait for it to complete.'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse)
      } as Response)

      const { result } = renderHook(() => useManualReflectionGeneration())

      let generationResult: any

      await act(async () => {
        generationResult = await result.current.generateReflection()
      })

      expect(generationResult).toBe(null)
      expect(result.current.error).toBe('A reflection is already being generated. Please wait for it to complete.')
      expect(result.current.isGenerating).toBe(false)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useManualReflectionGeneration())

      let generationResult: any

      await act(async () => {
        generationResult = await result.current.generateReflection()
      })

      expect(generationResult).toBe(null)
      expect(result.current.error).toBe('Network error')
      expect(result.current.isGenerating).toBe(false)
    })

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)

      const { result } = renderHook(() => useManualReflectionGeneration())

      let generationResult: any

      await act(async () => {
        generationResult = await result.current.generateReflection()
      })

      expect(generationResult).toBe(null)
      expect(result.current.error).toBe('Invalid JSON')
    })

    it('should handle API success=false response', async () => {
      const errorResponse = {
        success: false,
        error: 'Validation failed'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(errorResponse)
      } as Response)

      const { result } = renderHook(() => useManualReflectionGeneration())

      let generationResult: any

      await act(async () => {
        generationResult = await result.current.generateReflection()
      })

      expect(generationResult).toBe(null)
      expect(result.current.error).toBe('Validation failed')
    })
  })

  describe('Loading States', () => {
    it('should set isGenerating to true during generation', async () => {
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useManualReflectionGeneration())

      expect(result.current.isGenerating).toBe(false)

      // Start generation
      act(() => {
        result.current.generateReflection()
      })

      expect(result.current.isGenerating).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ success: true, operationId: 'test' })
        })
      })

      expect(result.current.isGenerating).toBe(false)
    })

    it('should clear error state when starting new generation', async () => {
      // First, set an error
      mockFetch.mockRejectedValueOnce(new Error('First error'))

      const { result } = renderHook(() => useManualReflectionGeneration())

      await act(async () => {
        await result.current.generateReflection()
      })

      expect(result.current.error).toBe('First error')

      // Then, start a new generation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, operationId: 'test' })
      } as Response)

      await act(async () => {
        await result.current.generateReflection()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('should handle undefined error messages', async () => {
      mockFetch.mockRejectedValueOnce(undefined)

      const { result } = renderHook(() => useManualReflectionGeneration())

      await act(async () => {
        await result.current.generateReflection()
      })

      expect(result.current.error).toBe('Failed to generate reflection')
    })

    it('should handle non-Error objects', async () => {
      mockFetch.mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useManualReflectionGeneration())

      await act(async () => {
        await result.current.generateReflection()
      })

      expect(result.current.error).toBe('Failed to generate reflection')
    })

    it('should handle missing error field in API response', async () => {
      const errorResponse = {
        success: false
        // Missing error field
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(errorResponse)
      } as Response)

      const { result } = renderHook(() => useManualReflectionGeneration())

      await act(async () => {
        await result.current.generateReflection()
      })

      expect(result.current.error).toBe('Failed to start reflection generation')
    })
  })

  describe('Concurrent Calls', () => {
    it('should handle multiple concurrent calls correctly', async () => {
      let resolveFirst: (value: any) => void
      let resolveSecond: (value: any) => void

      const firstPromise = new Promise(resolve => {
        resolveFirst = resolve
      })
      const secondPromise = new Promise(resolve => {
        resolveSecond = resolve
      })

      mockFetch
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise)

      const { result } = renderHook(() => useManualReflectionGeneration())

      // Start two concurrent generations
      const firstCall = act(async () => {
        return await result.current.generateReflection()
      })

      const secondCall = act(async () => {
        return await result.current.generateReflection()
      })

      // Resolve both
      await act(async () => {
        resolveFirst!({
          ok: true,
          json: () => Promise.resolve({ success: true, operationId: 'first' })
        })
        resolveSecond!({
          ok: true,
          json: () => Promise.resolve({ success: true, operationId: 'second' })
        })
      })

      const [firstResult, secondResult] = await Promise.all([firstCall, secondCall])

      expect(firstResult).toEqual({ operationId: 'first' })
      expect(secondResult).toEqual({ operationId: 'second' })
      expect(result.current.isGenerating).toBe(false)
    })
  })
})