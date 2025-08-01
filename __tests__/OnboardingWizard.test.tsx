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

describe('OnboardingWizard Integration Buttons', () => {
  const mockPush = jest.fn()

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
  })

  it('should handle multiple integration button clicks correctly', async () => {
    render(<OnboardingWizard />)

    // Navigate to step 1 (role/level selection)
    fireEvent.click(screen.getByRole('button', { name: /engineer/i }))
    fireEvent.click(screen.getByRole('button', { name: /senior/i }))
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