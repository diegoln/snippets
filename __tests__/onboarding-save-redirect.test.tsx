/**
 * Test for onboarding save and redirect bug
 * Ensures that after saving reflection, user reaches success page and can navigate to dashboard
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import fetchMock from 'jest-fetch-mock'

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
  }),
}))

describe('OnboardingWizard - Save and Redirect Flow', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
    localStorage.clear()
    mockReplace.mockClear()
  })

  const mockSession = {
    user: {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  const renderWithSession = (component: React.ReactElement) => {
    return render(
      <SessionProvider session={mockSession}>
        {component}
      </SessionProvider>
    )
  }

  const completeOnboardingToStep3 = async () => {
    const { container } = renderWithSession(<OnboardingWizard />)

    // Step 1: Fill role and level
    const engineeringButton = screen.getByRole('radio', { name: /Engineering/i })
    fireEvent.click(engineeringButton)
    
    const seniorButton = screen.getByRole('radio', { name: /Senior/i })
    fireEvent.click(seniorButton)

    // Mock profile save success
    fetchMock.mockResponseOnce(JSON.stringify({
      id: 'test-user',
      jobTitle: 'engineering',
      seniorityLevel: 'senior',
    }))

    // Continue to step 2
    const continueButton = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText(/Connect an integration/i)).toBeInTheDocument()
    })

    // Step 2: Connect an integration (mock)
    const connectButton = screen.getAllByText('Connect')[0]
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(screen.getByText(/✓ Connected/i)).toBeInTheDocument()
    })

    // Continue to step 3
    const continueButton2 = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton2)

    await waitFor(() => {
      expect(screen.getByText(/Review your first reflection/i)).toBeInTheDocument()
    })

    return container
  }

  it('should complete onboarding flow and reach success page after saving reflection', async () => {
    await completeOnboardingToStep3()

    // Mock successful snippet creation
    fetchMock.mockResponseOnce(JSON.stringify({
      id: 'snippet-123',
      weekNumber: 1,
      content: '## Done\n\n- Test bullet\n\n## Next\n\n- \n\n## Notes\n\n',
    }))

    // Mock successful onboarding completion
    fetchMock.mockResponseOnce(JSON.stringify({
      success: true,
      completed: true,
    }))

    // Click Save Reflection
    const saveButton = screen.getByRole('button', { name: /Save Reflection/i })
    fireEvent.click(saveButton)

    // Should reach success page
    await waitFor(() => {
      expect(screen.getByText(/🎉 Welcome to AdvanceWeekly!/i)).toBeInTheDocument()
      expect(screen.getByText(/Your first reflection is saved!/i)).toBeInTheDocument()
    })

    // Should show "Go to Dashboard" button
    expect(screen.getByRole('button', { name: /Go to Dashboard/i })).toBeInTheDocument()
  })

  it('should navigate to dashboard when clicking "Go to Dashboard" from success page', async () => {
    await completeOnboardingToStep3()

    // Mock successful saves
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'snippet-123' }))
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, completed: true }))

    // Save reflection to reach success page
    const saveButton = screen.getByRole('button', { name: /Save Reflection/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/🎉 Welcome to AdvanceWeekly!/i)).toBeInTheDocument()
    })

    // Click "Go to Dashboard"
    const dashboardButton = screen.getByRole('button', { name: /Go to Dashboard/i })
    fireEvent.click(dashboardButton)

    // Should navigate to dashboard
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should not save step 3 to localStorage to prevent reset loop', async () => {
    await completeOnboardingToStep3()

    // Mock successful saves
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'snippet-123' }))
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, completed: true }))

    // Save reflection to reach success page
    const saveButton = screen.getByRole('button', { name: /Save Reflection/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/🎉 Welcome to AdvanceWeekly!/i)).toBeInTheDocument()
    })

    // localStorage should not contain step 3
    const savedProgress = localStorage.getItem('onboarding-progress')
    
    if (savedProgress) {
      const { step } = JSON.parse(savedProgress)
      expect(step).not.toBe(3)
    }
  })

  it('should handle save errors gracefully and stay on step 3', async () => {
    await completeOnboardingToStep3()

    // Mock snippet creation failure
    fetchMock.mockResponseOnce(
      JSON.stringify({ error: 'Failed to create snippet' }),
      { status: 500 }
    )

    // Click Save Reflection
    const saveButton = screen.getByRole('button', { name: /Save Reflection/i })
    fireEvent.click(saveButton)

    // Should show error and stay on step 3
    await waitFor(() => {
      expect(screen.getByText(/Failed to create snippet/i)).toBeInTheDocument()
      expect(screen.getByText(/Review your first reflection/i)).toBeInTheDocument()
    })

    // Should not have navigated
    expect(mockReplace).not.toHaveBeenCalled()
  })
})