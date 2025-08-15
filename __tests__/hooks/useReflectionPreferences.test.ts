/**
 * Test suite for useReflectionPreferences hook
 * Tests API integration, error handling, and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useReflectionPreferences } from '../../hooks/useReflectionPreferences'
import { DEFAULT_REFLECTION_PREFERENCES } from '../../types/reflection-preferences'

// Mock fetch
global.fetch = jest.fn()

describe('useReflectionPreferences', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Loading', () => {
    it('should start in loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useReflectionPreferences())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.preferences).toBe(null)
      expect(result.current.error).toBe(null)
    })

    it('should fetch preferences on mount', async () => {
      const mockResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: ['google_calendar', 'github']
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_REFLECTION_PREFERENCES)
      expect(result.current.availableIntegrations).toEqual(['google_calendar', 'github'])
      expect(result.current.error).toBe(null)
    })

    it('should use defaults on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_REFLECTION_PREFERENCES)
      expect(result.current.error).toBe('Server error')
    })
  })

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const initialResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: ['google_calendar']
      }

      const updateResponse = {
        success: true,
        preferences: {
          ...DEFAULT_REFLECTION_PREFERENCES,
          preferredDay: 'monday',
          preferredHour: 9
        }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updateResponse)
        } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const updates = {
        preferredDay: 'monday' as const,
        preferredHour: 9
      }

      await act(async () => {
        await result.current.updatePreferences(updates)
      })

      expect(result.current.preferences?.preferredDay).toBe('monday')
      expect(result.current.preferences?.preferredHour).toBe(9)
      expect(result.current.error).toBe(null)

      // Verify correct API call
      expect(mockFetch).toHaveBeenLastCalledWith('/api/user/reflection-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })
    })

    it('should handle update errors', async () => {
      const initialResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: []
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Validation failed' })
        } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const updates = { preferredHour: 25 } // Invalid hour

      await expect(
        act(async () => {
          await result.current.updatePreferences(updates)
        })
      ).rejects.toThrow('Validation failed')

      expect(result.current.error).toBe('Validation failed')
    })

    it('should handle network errors', async () => {
      const initialResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: []
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const updates = { preferredDay: 'monday' as const }

      await expect(
        act(async () => {
          await result.current.updatePreferences(updates)
        })
      ).rejects.toThrow('Network error')

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('refreshPreferences', () => {
    it('should re-fetch preferences', async () => {
      const initialResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: ['google_calendar']
      }

      const refreshResponse = {
        success: true,
        preferences: {
          ...DEFAULT_REFLECTION_PREFERENCES,
          preferredDay: 'sunday'
        },
        availableIntegrations: ['google_calendar', 'github']
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(refreshResponse)
        } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences?.preferredDay).toBe('friday')
      expect(result.current.availableIntegrations).toEqual(['google_calendar'])

      await act(async () => {
        await result.current.refreshPreferences()
      })

      expect(result.current.preferences?.preferredDay).toBe('sunday')
      expect(result.current.availableIntegrations).toEqual(['google_calendar', 'github'])
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_REFLECTION_PREFERENCES)
      expect(result.current.error).toBe('Invalid JSON')
    })

    it('should handle missing response data', async () => {
      const invalidResponse = {
        success: true,
        // Missing preferences and availableIntegrations
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse)
      } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_REFLECTION_PREFERENCES)
      expect(result.current.availableIntegrations).toEqual([])
    })

    it('should clear errors on successful operations', async () => {
      const errorResponse = {
        success: false,
        error: 'Server error'
      }

      const successResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: []
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve(errorResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(successResponse)
        } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Server error')

      await act(async () => {
        await result.current.refreshPreferences()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Loading States', () => {
    it('should not be loading during updates', async () => {
      const initialResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: []
      }

      const updateResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updateResponse)
        } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // isLoading should remain false during updates
      act(() => {
        result.current.updatePreferences({ preferredDay: 'monday' })
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('API Call Structure', () => {
    it('should make GET request with correct headers', async () => {
      const response = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response)
      } as Response)

      renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user/reflection-preferences', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      })
    })

    it('should make PUT request with correct headers and body', async () => {
      const initialResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES,
        availableIntegrations: []
      }

      const updateResponse = {
        success: true,
        preferences: DEFAULT_REFLECTION_PREFERENCES
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updateResponse)
        } as Response)

      const { result } = renderHook(() => useReflectionPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const updates = { preferredDay: 'monday' as const }

      await act(async () => {
        await result.current.updatePreferences(updates)
      })

      expect(mockFetch).toHaveBeenLastCalledWith('/api/user/reflection-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })
    })
  })
})