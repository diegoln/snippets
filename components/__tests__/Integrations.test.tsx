/**
 * Comprehensive tests for Integrations component
 * Tests loading states, error handling, timeouts, and user interactions
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { Integrations } from '../Integrations'

// Mock fetch and confirm
global.fetch = jest.fn()
global.confirm = jest.fn()

// Mock console methods
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})
afterAll(() => {
  console.error = originalError
})

describe('Integrations Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Loading States', () => {
    it('should show loading spinner initially', () => {
      // Mock fetch to never resolve
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<Integrations />)
      
      expect(screen.getByText('Loading integrations...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // Spinner
    })

    it('should stop loading after successful fetch', async () => {
      const mockIntegrations = {
        integrations: [
          {
            id: '1',
            type: 'google_calendar',
            isActive: true,
            lastSyncAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIntegrations
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.queryByText('Loading integrations...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Connect Your Calendar')).toBeInTheDocument()
    })
  })

  describe('Timeout Behavior', () => {
    it('should timeout after 10 seconds and show error', async () => {
      // Mock fetch to never resolve
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<Integrations />)

      // Fast-forward 10 seconds
      jest.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Integrations')).toBeInTheDocument()
        expect(screen.getByText('Request timed out. Please try again.')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      // Verify console error was called
      expect(console.error).toHaveBeenCalledWith('Integration fetch timeout')
    })

    it('should abort request when timeout occurs', async () => {
      const abortSpy = jest.fn()
      const mockAbortController = {
        abort: abortSpy,
        signal: {} as AbortSignal
      }
      
      // Mock AbortController
      global.AbortController = jest.fn(() => mockAbortController) as any

      // Mock fetch to never resolve
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<Integrations />)

      // Fast-forward to timeout
      jest.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(abortSpy).toHaveBeenCalled()
      })
    })

    it('should clear timeout on successful response', async () => {
      const mockIntegrations = { integrations: [] }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIntegrations
      })

      render(<Integrations />)

      // Response should come before timeout
      await waitFor(() => {
        expect(screen.queryByText('Loading integrations...')).not.toBeInTheDocument()
      })

      // Fast-forward past timeout
      jest.advanceTimersByTime(11000)

      // Should not show timeout error
      expect(screen.queryByText('Request timed out')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show authentication error for 401 response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Integrations')).toBeInTheDocument()
        expect(screen.getByText('Authentication required. Please sign in again.')).toBeInTheDocument()
      })
    })

    it('should show generic error for other HTTP errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Integrations')).toBeInTheDocument()
        expect(screen.getByText('Failed to load integrations (500)')).toBeInTheDocument()
      })
    })

    it('should show network error for fetch failures', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Integrations')).toBeInTheDocument()
        expect(screen.getByText('Failed to load integrations. Please check your connection.')).toBeInTheDocument()
      })
    })

    it('should not show error for aborted requests', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(abortError)

      render(<Integrations />)

      // Wait a bit
      await waitFor(() => {
        expect(screen.queryByText('Loading integrations...')).not.toBeInTheDocument()
      })

      // Should not show error state
      expect(screen.queryByText('Unable to Load Integrations')).not.toBeInTheDocument()
    })
  })

  describe('Cleanup and Memory Leaks', () => {
    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      
      // Mock fetch to never resolve
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      const { unmount } = render(<Integrations />)

      // Unmount before timeout
      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should abort fetch on unmount', () => {
      const abortSpy = jest.fn()
      const mockAbortController = {
        abort: abortSpy,
        signal: {} as AbortSignal
      }
      
      global.AbortController = jest.fn(() => mockAbortController) as any

      // Mock fetch to never resolve
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      const { unmount } = render(<Integrations />)

      unmount()

      expect(abortSpy).toHaveBeenCalled()
    })

    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      ;(global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise)

      const { unmount } = render(<Integrations />)

      // Unmount component
      unmount()

      // Resolve fetch after unmount
      resolvePromise!({
        ok: true,
        json: async () => ({ integrations: [] })
      })

      // Should not throw any errors about setting state on unmounted component
      await waitFor(() => {
        expect(console.error).not.toHaveBeenCalledWith(
          expect.stringContaining("Can't perform a React state update on an unmounted component")
        )
      })
    })
  })

  describe('Retry Functionality', () => {
    it('should show retry button on error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    it('should reload page when retry is clicked', async () => {
      // Mock window.location.reload
      const reloadMock = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      })

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Try Again'))

      expect(reloadMock).toHaveBeenCalled()
    })
  })

  describe('Integration with Calendar Connection', () => {
    it('should show connect button when no calendar integration exists', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ integrations: [] })
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument()
      })
    })

    it('should show connected status when calendar integration exists', async () => {
      const mockIntegrations = {
        integrations: [
          {
            id: '1',
            type: 'google_calendar',
            isActive: true,
            lastSyncAt: '2024-01-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIntegrations
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument()
      })
    })
  })

  describe('Request Configuration', () => {
    it('should include credentials in fetch request', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ integrations: [] })
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/integrations',
          expect.objectContaining({
            credentials: 'include'
          })
        )
      })
    })

    it('should include abort signal in fetch request', async () => {
      const mockSignal = {} as AbortSignal
      const mockAbortController = {
        abort: jest.fn(),
        signal: mockSignal
      }
      
      global.AbortController = jest.fn(() => mockAbortController) as any

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ integrations: [] })
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/integrations',
          expect.objectContaining({
            signal: mockSignal
          })
        )
      })
    })
  })

  describe('Disconnect Functionality', () => {
    const mockConnectedIntegration = {
      integrations: [
        {
          id: 'calendar-123',
          type: 'google_calendar',
          isActive: true,
          lastSyncAt: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]
    }

    beforeEach(() => {
      // Reset mocks for each test
      ;(global.fetch as jest.Mock).mockClear()
      ;(global.confirm as jest.Mock).mockClear()
    })

    it('should show disconnect button for connected calendar', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConnectedIntegration
      })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Google Calendar Connected')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })
    })

    it('should show confirmation dialog when disconnect is clicked', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConnectedIntegration
      })

      ;(global.confirm as jest.Mock).mockReturnValueOnce(false) // User cancels

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to disconnect Google Calendar? Your data from this source will no longer be collected for future reflections.'
      )

      // Should not make delete API call since user cancelled
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only initial load
    })

    it('should disconnect integration when user confirms', async () => {
      // Mock initial load
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnectedIntegration
        })
        // Mock successful disconnect
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Integration removed successfully' })
        })

      ;(global.confirm as jest.Mock).mockReturnValueOnce(true) // User confirms

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))

      // Should make delete API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/integrations?id=calendar-123',
          expect.objectContaining({
            method: 'DELETE',
            credentials: 'include'
          })
        )
      })

      // Should update UI to show connect button
      await waitFor(() => {
        expect(screen.queryByText('Google Calendar Connected')).not.toBeInTheDocument()
        expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument()
      })
    })

    it('should handle disconnect API errors gracefully', async () => {
      // Mock initial load
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnectedIntegration
        })
        // Mock API error
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' })
        })

      ;(global.confirm as jest.Mock).mockReturnValueOnce(true)

      // Mock alert to capture error message
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to disconnect calendar: Internal server error')
      })

      // Integration should remain connected
      expect(screen.getByText('Google Calendar Connected')).toBeInTheDocument()

      alertSpy.mockRestore()
    })

    it('should show loading state during disconnection', async () => {
      // Mock initial load
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnectedIntegration
        })

      ;(global.confirm as jest.Mock).mockReturnValueOnce(true)

      // Mock slow disconnect response
      let resolveDisconnect: (value: any) => void
      const disconnectPromise = new Promise((resolve) => {
        resolveDisconnect = resolve
      })
      ;(global.fetch as jest.Mock).mockReturnValueOnce(disconnectPromise)

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Disconnecting...')).toBeInTheDocument()
      })

      // Button should be disabled during loading
      expect(screen.getByRole('button', { name: /disconnecting/i })).toBeDisabled()

      // Resolve the disconnect
      resolveDisconnect!({
        ok: true,
        json: async () => ({ success: true })
      })

      // Should return to normal state
      await waitFor(() => {
        expect(screen.queryByText('Disconnecting...')).not.toBeInTheDocument()
      })
    })

    it('should handle network errors during disconnection', async () => {
      // Mock initial load
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnectedIntegration
        })
        // Mock network error
        .mockRejectedValueOnce(new Error('Network error'))

      ;(global.confirm as jest.Mock).mockReturnValueOnce(true)

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to disconnect calendar. Please try again.')
      })

      alertSpy.mockRestore()
    })

    it('should handle missing integration gracefully', async () => {
      // Mock initial load with empty integrations
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ integrations: [] })
        })

      render(<Integrations />)

      await waitFor(() => {
        expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument()
      })
    })

    it('should use correct environment headers for disconnect API', async () => {
      const originalEnv = process.env.NODE_ENV

      // Test development environment
      process.env.NODE_ENV = 'development'

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnectedIntegration
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      ;(global.confirm as jest.Mock).mockReturnValueOnce(true)

      render(<Integrations />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/integrations?id=calendar-123',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Dev-User-Id': 'dev-user-123'
            })
          })
        )
      })

      // Test production environment
      process.env.NODE_ENV = 'production'
      ;(global.fetch as jest.Mock).mockClear()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConnectedIntegration
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      render(<Integrations />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
      })

      await waitFor(() => {
        const deleteCall = (global.fetch as jest.Mock).mock.calls.find(
          call => call[0].includes('DELETE') || call[1]?.method === 'DELETE'
        )
        if (deleteCall && deleteCall[1]?.headers) {
          expect(deleteCall[1].headers).not.toHaveProperty('X-Dev-User-Id')
        }
      })

      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })
})