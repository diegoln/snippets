/**
 * Test for OnboardingWizard integration button behavior
 * 
 * This test verifies the specific bug reported:
 * 1. When clicking one button, other buttons should NOT animate
 * 2. When clicking a second button, the first button should remain "Connected"
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '../components/OnboardingWizard'

// Mock the dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('../components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size: string }) => <div data-testid="loading-spinner">{size}</div>
}))
jest.mock('../components/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Mock global fetch
global.fetch = jest.fn()
global.confirm = jest.fn()

describe('OnboardingWizard', () => {
  const mockPush = jest.fn()
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>
  const mockConfirm = confirm as jest.MockedFunction<typeof confirm>

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      status: 'authenticated'
    } as any)

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)

    // Clear previous calls
    mockPush.mockClear()
    mockFetch.mockClear()
    mockConfirm.mockClear()

    // Default fetch mock responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ integrations: [] })
    } as Response)
  })

  describe('Step Sequence', () => {
    it('should follow correct 5-step sequence including career plan', async () => {
      render(<OnboardingWizard />)

      // Step 0: Role/Level
      expect(screen.getByText(/tell us about your role/i)).toBeInTheDocument()
      
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      // Step 1: Career Plan (NEW STEP)
      await waitFor(() => {
        expect(screen.getByText(/career progression plan/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/continue/i))

      // Step 2: Integrations
      await waitFor(() => {
        expect(screen.getByText(/connect an integration/i)).toBeInTheDocument()
      })

      // Connect an integration to proceed
      const connectButton = screen.getByRole('button', { name: /connect/i })
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(screen.getByText('✓ Connected')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/continue/i))

      // Step 3: Reflection
      await waitFor(() => {
        expect(screen.getByText(/review your first reflection/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/continue/i))

      // Step 4: Success
      await waitFor(() => {
        expect(screen.getByText(/welcome to advanceweekly/i)).toBeInTheDocument()
      })
    })

    it('should not allow skipping career plan step', async () => {
      render(<OnboardingWizard />)

      // Complete role/level step
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      // Should be on career plan step, not integrations
      await waitFor(() => {
        expect(screen.getByText(/career progression plan/i)).toBeInTheDocument()
        expect(screen.queryByText(/connect an integration/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Integration Buttons', () => {
    it('should handle multiple integration button clicks correctly', async () => {
    render(<OnboardingWizard />)

    // Navigate to step 0 (role/level selection)
    fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
    fireEvent.click(screen.getByRole('button', { name: /senior/i }))
    fireEvent.click(screen.getByText(/continue/i))

    // Step 1: Career plan (should appear next)
    await waitFor(() => {
      expect(screen.getByText(/career progression plan/i)).toBeInTheDocument()
    })

    // Complete career plan step
    fireEvent.click(screen.getByText(/continue/i))

    // Now we're on step 2 (integrations)
    await waitFor(() => {
      expect(screen.getByText(/connect an integration/i)).toBeInTheDocument()
    })

    // Get the three integration buttons
    const calendarButton = screen.getByRole('button', { name: /connect/i })
    const githubButton = screen.getAllByRole('button', { name: /connect/i })[1]
    const jiraButton = screen.getAllByRole('button', { name: /connect/i })[2]

    // Test 1: Click calendar button - should show loading only on that button
    fireEvent.click(calendarButton)

    // Calendar button should show loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    // Other buttons should be disabled but NOT show loading
    expect(githubButton).toBeDisabled()
    expect(jiraButton).toBeDisabled()

    // Wait for connection to complete
    await waitFor(() => {
      expect(screen.getByText('✓ Connected')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Test 2: Calendar should show "✓ Connected", others should show "Connect"
    const connectedButton = screen.getByText('✓ Connected')
    expect(connectedButton).toBeInTheDocument()

    // Other buttons should now be enabled and show "Connect"
    const remainingButtons = screen.getAllByRole('button', { name: /connect/i })
    expect(remainingButtons).toHaveLength(2) // GitHub and Jira

    // Test 3: Click GitHub button - calendar should REMAIN connected
    const githubConnectButton = remainingButtons[0]
    fireEvent.click(githubConnectButton)

    // GitHub should show loading
    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    // CRITICAL TEST: Calendar button should STILL show "✓ Connected"
    expect(screen.getByText('✓ Connected')).toBeInTheDocument()

    // Wait for GitHub connection to complete
    await waitFor(() => {
      const connectedButtons = screen.getAllByText('✓ Connected')
      expect(connectedButtons).toHaveLength(2) // Both calendar and GitHub
    }, { timeout: 2000 })

    // Test 4: Both buttons should remain connected
    const allConnectedButtons = screen.getAllByText('✓ Connected')
    expect(allConnectedButtons).toHaveLength(2)

    // Only Jira should show "Connect"
    const jiraConnectButtons = screen.getAllByRole('button', { name: /connect/i })
    expect(jiraConnectButtons).toHaveLength(1)
    })
  })

  describe('Integration Disconnect', () => {
    beforeEach(() => {
      // Mock fetch to return existing integrations
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            integrations: [{
              id: 'integration-123',
              type: 'google_calendar',
              isActive: true,
              createdAt: '2023-01-01T00:00:00.000Z'
            }]
          })
        } as Response)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ integrations: [] })
        } as Response)
    })

    it('should show disconnect button for connected integrations', async () => {
      render(<OnboardingWizard />)

      // Navigate to integrations step
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        expect(screen.getByText(/career progression plan/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        expect(screen.getByText(/connect an integration/i)).toBeInTheDocument()
      })

      // Should show connected state with disconnect button
      await waitFor(() => {
        expect(screen.getByText('✓ Connected')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
      })
    })

    it('should confirm before disconnecting integration', async () => {
      render(<OnboardingWizard />)

      // Navigate to integrations step
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        fireEvent.click(screen.getByText(/continue/i))
      })

      await waitFor(() => {
        expect(screen.getByText(/connect an integration/i)).toBeInTheDocument()
      })

      // Mock user cancels confirmation
      mockConfirm.mockReturnValueOnce(false)

      const disconnectButton = await screen.findByRole('button', { name: /disconnect/i })
      fireEvent.click(disconnectButton)

      // Should show confirmation dialog
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to disconnect Google Calendar?')
      )

      // Should not make API call since user cancelled
      expect(mockFetch).toHaveBeenCalledTimes(1) // Only initial load
    })

    it('should disconnect integration when user confirms', async () => {
      render(<OnboardingWizard />)

      // Navigate to integrations step
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        fireEvent.click(screen.getByText(/continue/i))
      })

      await waitFor(() => {
        expect(screen.getByText(/connect an integration/i)).toBeInTheDocument()
      })

      // Mock user confirms disconnection
      mockConfirm.mockReturnValueOnce(true)

      // Mock successful disconnection API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            integrations: [{
              id: 'integration-123',
              type: 'google_calendar',
              isActive: true,
              createdAt: '2023-01-01T00:00:00.000Z'
            }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Integration removed successfully' })
        } as Response)

      const disconnectButton = await screen.findByRole('button', { name: /disconnect/i })
      fireEvent.click(disconnectButton)

      // Should call APIs to fetch integrations and delete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/integrations', expect.objectContaining({
          headers: expect.objectContaining({
            'X-Dev-User-Id': 'dev-user-123'
          })
        }))

        expect(mockFetch).toHaveBeenCalledWith('/api/integrations?id=integration-123', expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'X-Dev-User-Id': 'dev-user-123'
          })
        }))
      })

      // Should update UI to show connection option again
      await waitFor(() => {
        expect(screen.queryByText('✓ Connected')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
      })
    })

    it('should handle disconnection API errors gracefully', async () => {
      render(<OnboardingWizard />)

      // Navigate to integrations step
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        fireEvent.click(screen.getByText(/continue/i))
      })

      await waitFor(() => {
        expect(screen.getByText(/connect an integration/i)).toBeInTheDocument()
      })

      // Mock user confirms disconnection
      mockConfirm.mockReturnValueOnce(true)

      // Mock API error
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            integrations: [{
              id: 'integration-123',
              type: 'google_calendar',
              isActive: true,
              createdAt: '2023-01-01T00:00:00.000Z'
            }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' })
        } as Response)

      const disconnectButton = await screen.findByRole('button', { name: /disconnect/i })
      fireEvent.click(disconnectButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to disconnect integration/i)).toBeInTheDocument()
      })

      // Integration should remain connected
      expect(screen.getByText('✓ Connected')).toBeInTheDocument()
    })

    it('should handle environment-specific headers correctly', async () => {
      // Test development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<OnboardingWizard />)

      // Navigate to integrations step and disconnect
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        fireEvent.click(screen.getByText(/continue/i))
      })

      mockConfirm.mockReturnValueOnce(true)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            integrations: [{ id: 'test-123', type: 'google_calendar', isActive: true, createdAt: '2023-01-01' }]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)

      const disconnectButton = await screen.findByRole('button', { name: /disconnect/i })
      fireEvent.click(disconnectButton)

      // Should include dev headers in development
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/integrations'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Dev-User-Id': 'dev-user-123'
            })
          })
        )
      })

      // Test production environment
      process.env.NODE_ENV = 'production'
      mockFetch.mockClear()

      render(<OnboardingWizard />)
      fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
      fireEvent.click(screen.getByRole('button', { name: /senior/i }))
      fireEvent.click(screen.getByText(/continue/i))

      await waitFor(() => {
        fireEvent.click(screen.getByText(/continue/i))
      })

      // In production, should not include dev headers
      await waitFor(() => {
        const fetchCalls = mockFetch.mock.calls
        const headersCall = fetchCalls.find(call => call[1]?.headers)
        if (headersCall) {
          expect(headersCall[1].headers).not.toHaveProperty('X-Dev-User-Id')
        }
      })

      // Restore original environment
      process.env.NODE_ENV = originalEnv
    })
  })
})