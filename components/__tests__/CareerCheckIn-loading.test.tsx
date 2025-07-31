/**
 * Unit tests for CareerCheckIn loading states and feedback
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CareerCheckInComponent } from '../CareerCheckIn'

describe('CareerCheckIn Loading States', () => {
  const mockAssessments = []
  const mockOnGenerateDraft = jest.fn()
  const mockOnDeleteAssessment = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show Generate New Draft button initially', () => {
    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    expect(screen.getByText('+ Draft Career Check-In')).toBeInTheDocument()
  })

  it('should show generation form when Draft Career Check-In is clicked', async () => {
    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    const generateButton = screen.getByText('+ Draft Career Check-In')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Create Draft')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025')).toBeInTheDocument()
    })
  })

  it('should show loading state when Create Draft is clicked', async () => {
    // Mock the onGenerateDraft to be a slow promise
    mockOnGenerateDraft.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    // Open the generation form
    const generateNewButton = screen.getByText('+ Draft Career Check-In')
    fireEvent.click(generateNewButton)

    await waitFor(() => {
      // Fill out the form
      fireEvent.change(screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025'), {
        target: { value: 'Q1 2025 Review' }
      })
      fireEvent.change(screen.getByDisplayValue(''), {
        target: { value: '2025-01-01' }
      })
    })

    // Submit the form
    const generateButton = screen.getByText('Create Draft')
    fireEvent.click(generateButton)

    // Should show loading state immediately
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })
  })

  it('should disable form elements during generation', async () => {
    // Mock a slow generation
    mockOnGenerateDraft.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    // Open the generation form
    fireEvent.click(screen.getByText('+ Draft Career Check-In'))

    await waitFor(() => {
      // Fill out the form
      const cycleNameInput = screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025')
      fireEvent.change(cycleNameInput, { target: { value: 'Q1 2025 Review' } })
      
      const startDateInputs = screen.getAllByDisplayValue('')
      if (startDateInputs.length > 0) {
        fireEvent.change(startDateInputs[0], { target: { value: '2025-01-01' } })
      }
    })

    // Submit the form
    const generateButton = screen.getByText('Create Draft')
    fireEvent.click(generateButton)

    // Check that form elements are disabled
    await waitFor(() => {
      const cycleNameInput = screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025')
      expect(cycleNameInput).toBeDisabled()

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeDisabled()

      const generateButtonLoading = screen.getByText('Generating...')
      expect(generateButtonLoading).toBeInTheDocument()
    })
  })

  it('should show spinner in Create Draft button during loading', async () => {
    mockOnGenerateDraft.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    // Open form and fill it
    fireEvent.click(screen.getByText('+ Draft Career Check-In'))

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025'), {
        target: { value: 'Q1 2025 Review' }
      })
    })

    // Submit form
    const generateButton = screen.getByText('Create Draft')
    fireEvent.click(generateButton)

    // Check for loading spinner and text
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
      
      // Check for spinner (SVG with animate-spin class)
      const spinners = document.querySelectorAll('.animate-spin')
      expect(spinners.length).toBeGreaterThan(0)
    })
  })


  it('should hide loading state after successful generation', async () => {
    let resolveGeneration: (value?: any) => void
    mockOnGenerateDraft.mockImplementation(() => new Promise(resolve => {
      resolveGeneration = resolve
    }))

    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    // Open and submit form
    fireEvent.click(screen.getByText('+ Draft Career Check-In'))

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025'), {
        target: { value: 'Q1 2025 Review' }
      })
    })

    fireEvent.click(screen.getByText('Create Draft'))

    // Loading state should be visible
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })

    // Resolve the promise
    resolveGeneration!()

    // Loading state should disappear
    await waitFor(() => {
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument()
    })
  })

  it('should show error message if generation fails', async () => {
    mockOnGenerateDraft.mockRejectedValue(new Error('Generation failed'))

    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    // Open and submit form
    fireEvent.click(screen.getByText('+ Draft Career Check-In'))

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025'), {
        target: { value: 'Q1 2025 Review' }
      })
    })

    fireEvent.click(screen.getByText('Create Draft'))

    // Should show error after generation fails
    await waitFor(() => {
      expect(screen.getByText('Generation Failed')).toBeInTheDocument()
      expect(screen.getByText('Generation failed')).toBeInTheDocument()
    })
  })

  it('should prevent multiple submissions during generation', async () => {
    let generationCount = 0
    mockOnGenerateDraft.mockImplementation(() => {
      generationCount++
      return new Promise(resolve => setTimeout(resolve, 100))
    })

    render(
      <CareerCheckInComponent
        assessments={mockAssessments}
        onGenerateDraft={mockOnGenerateDraft}
        onDeleteAssessment={mockOnDeleteAssessment}
      />
    )

    // Open and fill form
    fireEvent.click(screen.getByText('+ Draft Career Check-In'))

    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('e.g., H1 2025, Q4 2024, Annual Review 2025'), {
        target: { value: 'Q1 2025 Review' }
      })
    })

    // Submit form multiple times quickly
    const generateButton = screen.getByText('Create Draft')
    fireEvent.click(generateButton)
    fireEvent.click(generateButton)
    fireEvent.click(generateButton)

    // Should only call onGenerateDraft once
    await waitFor(() => {
      expect(mockOnGenerateDraft).toHaveBeenCalledTimes(1)
    })
  })
})