/**
 * Integration tests for onboarding with custom role/level values
 * These tests would have caught the validation issues with custom values
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import fetchMock from 'jest-fetch-mock'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

describe('OnboardingWizard - Custom Values', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
    localStorage.clear()
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

  it('should accept custom role when "Other" is selected', async () => {
    renderWithSession(<OnboardingWizard />)

    // Select "Other" role
    const otherRoleRadio = screen.getByLabelText(/Other:/i)
    fireEvent.click(otherRoleRadio)

    // Enter custom role
    const customRoleInput = screen.getByPlaceholderText(/Enter your role/i)
    fireEvent.change(customRoleInput, { target: { value: 'Solutions Architect' } })

    // Select a level (required)
    const seniorButton = screen.getByRole('radio', { name: /Senior/i })
    fireEvent.click(seniorButton)

    // Mock successful profile save
    fetchMock.mockResponseOnce(JSON.stringify({
      id: 'test-user',
      jobTitle: 'Solutions Architect',
      seniorityLevel: 'senior',
    }))

    // Click Continue
    const continueButton = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton)

    // Verify API was called with custom role
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            jobTitle: 'Solutions Architect',
            seniorityLevel: 'senior',
          }),
        })
      )
    })
  })

  it('should accept custom level when "Other" is selected', async () => {
    renderWithSession(<OnboardingWizard />)

    // Select a role
    const engineeringButton = screen.getByRole('radio', { name: /Engineering/i })
    fireEvent.click(engineeringButton)

    // Select "Other" level
    const otherLevelRadio = screen.getAllByLabelText(/Other:/i)[1] // Second "Other" is for level
    fireEvent.click(otherLevelRadio)

    // Enter custom level
    const customLevelInput = screen.getByPlaceholderText(/Enter your level/i)
    fireEvent.change(customLevelInput, { target: { value: 'Principal Consultant' } })

    // Mock successful profile save
    fetchMock.mockResponseOnce(JSON.stringify({
      id: 'test-user',
      jobTitle: 'engineering',
      seniorityLevel: 'Principal Consultant',
    }))

    // Click Continue
    const continueButton = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton)

    // Verify API was called with custom level
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            jobTitle: 'engineering',
            seniorityLevel: 'Principal Consultant',
          }),
        })
      )
    })
  })

  it('should show validation error immediately on step 1 if API rejects values', async () => {
    renderWithSession(<OnboardingWizard />)

    // Select "Other" for both
    const otherRoleRadio = screen.getByLabelText(/Other:/i)
    fireEvent.click(otherRoleRadio)
    
    const customRoleInput = screen.getByPlaceholderText(/Enter your role/i)
    fireEvent.change(customRoleInput, { target: { value: 'Invalid Role' } })

    const otherLevelRadio = screen.getAllByLabelText(/Other:/i)[1]
    fireEvent.click(otherLevelRadio)
    
    const customLevelInput = screen.getByPlaceholderText(/Enter your level/i)
    fireEvent.change(customLevelInput, { target: { value: 'Invalid Level' } })

    // Mock API error
    fetchMock.mockResponseOnce(
      JSON.stringify({ error: 'Invalid values provided' }),
      { status: 400 }
    )

    // Click Continue
    const continueButton = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton)

    // Should show error on same page
    await waitFor(() => {
      expect(screen.getByText(/Invalid values provided/i)).toBeInTheDocument()
    })

    // Should still be on step 1
    expect(screen.getByText(/Tell us about your role/i)).toBeInTheDocument()
  })

  it('should require both role and level before continuing', async () => {
    renderWithSession(<OnboardingWizard />)

    // Select "Other" role but don't fill it
    const otherRoleRadio = screen.getByLabelText(/Other:/i)
    fireEvent.click(otherRoleRadio)

    // Try to continue without filling custom role
    const continueButton = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton)

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Please specify your role/i)).toBeInTheDocument()
    })

    // Fill role but not level
    const customRoleInput = screen.getByPlaceholderText(/Enter your role/i)
    fireEvent.change(customRoleInput, { target: { value: 'DevOps Engineer' } })

    // Try again
    fireEvent.click(continueButton)

    // Should show level error
    await waitFor(() => {
      expect(screen.getByText(/Please specify your level/i)).toBeInTheDocument()
    })
  })

  it('should handle both custom role and custom level together', async () => {
    renderWithSession(<OnboardingWizard />)

    // Select "Other" for both
    const [otherRoleRadio, otherLevelRadio] = screen.getAllByLabelText(/Other:/i)
    
    fireEvent.click(otherRoleRadio)
    const customRoleInput = screen.getByPlaceholderText(/Enter your role/i)
    fireEvent.change(customRoleInput, { target: { value: 'DevSecOps Engineer' } })

    fireEvent.click(otherLevelRadio)
    const customLevelInput = screen.getByPlaceholderText(/Enter your level/i)
    fireEvent.change(customLevelInput, { target: { value: 'Tech Lead' } })

    // Mock successful profile save
    fetchMock.mockResponseOnce(JSON.stringify({
      id: 'test-user',
      jobTitle: 'DevSecOps Engineer',
      seniorityLevel: 'Tech Lead',
    }))

    // Click Continue
    const continueButton = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueButton)

    // Verify API was called with both custom values
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/user/profile',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            jobTitle: 'DevSecOps Engineer',
            seniorityLevel: 'Tech Lead',
          }),
        })
      )
    })

    // Should advance to next step
    await waitFor(() => {
      expect(screen.getByText(/Connect an integration/i)).toBeInTheDocument()
    })
  })
})