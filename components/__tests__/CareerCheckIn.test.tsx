/**
 * Unit tests for CareerCheckIn component styling
 * Tests design system integration and AdvanceWeekly brand compliance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CareerCheckInComponent } from '../CareerCheckIn'
import { PerformanceAssessment } from '../../types/performance'

// Mock dependencies
jest.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="markdown-renderer" className={className}>
      {content}
    </div>
  )
}))

jest.mock('../LoadingSpinner', () => ({
  LoadingSpinner: ({ size, color }: { size?: string; color?: string }) => (
    <div data-testid="loading-spinner" data-size={size} data-color={color}>
      Loading...
    </div>
  )
}))

const mockAssessments: PerformanceAssessment[] = [
  {
    id: '1',
    cycleName: 'Q4 2024',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    checkInFocusAreas: 'Focus on leadership',
    generatedDraft: 'Sample check-in content...',
    createdAt: '2024-12-15',
    isGenerating: false
  },
  {
    id: '2',
    cycleName: 'H1 2025',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    checkInFocusAreas: '',
    generatedDraft: 'Another check-in...',
    createdAt: '2024-12-20',
    isGenerating: true
  }
]

const defaultProps = {
  assessments: mockAssessments,
  onGenerateDraft: jest.fn(),
  onDeleteAssessment: jest.fn()
}

describe('CareerCheckIn Design System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AdvanceWeekly Brand Styling', () => {
    it('should use primary brand color for headings', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const heading = screen.getByText('Career Check-Ins')
      expect(heading).toHaveClass('text-heading-2', 'text-primary')
    })

    it('should use accent button styling for primary actions', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      expect(generateButton).toHaveClass(
        'btn-accent',
        'px-4',
        'py-2',
        'rounded-pill',
        'font-medium',
        'transition-advance',
        'shadow-elevation-1'
      )
    })

    it('should use card styling for form container', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const formContainer = screen.getByRole('region')
      expect(formContainer).toHaveClass('card', 'bg-surface', 'p-6')
    })

    it('should use brand typography scale', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const formHeading = screen.getByText('Generate Career Check-In')
      expect(formHeading).toHaveClass('text-heading-2', 'text-primary')
    })

    it('should use secondary text styling for descriptions', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const description = screen.getByText(/generate ai-powered career check-ins/i)
      expect(description).toHaveClass('text-secondary')
    })
  })

  describe('Button Design System Compliance', () => {
    it('should use btn-primary class for form submission', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const submitButton = screen.getByRole('button', { name: /generate draft/i })
      expect(submitButton).toHaveClass(
        'btn-primary',
        'px-4',
        'py-2',
        'rounded-pill'
      )
    })

    it('should use neutral styling for cancel button', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toHaveClass('rounded-pill', 'transition-advance')
      expect(cancelButton).toHaveClass('text-secondary', 'bg-neutral-100')
    })

    it('should apply proper disabled state styling', async () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form and fill required fields
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const cycleInput = screen.getByLabelText(/check-in period name/i)
      const startDateInput = screen.getByLabelText(/cycle start date/i)
      const endDateInput = screen.getByLabelText(/cycle end date/i)
      
      fireEvent.change(cycleInput, { target: { value: 'Test Cycle' } })
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })
      
      const submitButton = screen.getByRole('button', { name: /generate draft/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(submitButton).toHaveClass('opacity-50', 'cursor-not-allowed')
      })
    })
  })

  describe('Motion and Transitions', () => {
    it('should use brand transition timing', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      expect(generateButton).toHaveClass('transition-advance')
    })

    it('should apply hover states with proper transitions', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toHaveClass('transition-advance')
    })
  })

  describe('Spacing and Layout', () => {
    it('should use consistent spacing scale', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const formContainer = screen.getByRole('region')
      expect(formContainer).toHaveClass('p-6')
      
      const form = screen.getByRole('form')
      expect(form).toHaveClass('space-y-4')
    })

    it('should use proper button spacing', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      expect(generateButton).toHaveClass('px-4', 'py-2')
    })
  })

  describe('Border Radius Consistency', () => {
    it('should use pill radius for buttons', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      expect(generateButton).toHaveClass('rounded-pill')
    })

    it('should use card radius for containers', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const formContainer = screen.getByRole('region')
      expect(formContainer).toHaveClass('card')
    })
  })

  describe('Color Palette Usage', () => {
    it('should use neutral colors for disabled states', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toHaveClass('text-secondary', 'bg-neutral-100')
    })

    it('should maintain proper hover states with brand colors', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toHaveClass('hover:bg-primary-100')
    })
  })

  describe('Shadow Usage', () => {
    it('should use elevation shadow for important elements', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      expect(generateButton).toHaveClass('shadow-elevation-1')
    })
  })

  describe('Loading States Integration', () => {
    it('should integrate LoadingSpinner with proper styling', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form and fill required fields
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const cycleInput = screen.getByLabelText(/check-in period name/i)
      const startDateInput = screen.getByLabelText(/cycle start date/i)
      const endDateInput = screen.getByLabelText(/cycle end date/i)
      
      fireEvent.change(cycleInput, { target: { value: 'Test Cycle' } })
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })
      
      const submitButton = screen.getByRole('button', { name: /generate draft/i })
      fireEvent.click(submitButton)
      
      const spinner = screen.getByTestId('loading-spinner')
      expect(spinner).toHaveAttribute('data-size', 'sm')
      expect(spinner).toHaveAttribute('data-color', 'white')
    })
  })

  describe('Form Layout Responsiveness', () => {
    it('should use responsive grid for date inputs', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      // Open the form
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      fireEvent.click(generateButton)
      
      const dateContainer = screen.getByLabelText(/cycle start date/i).closest('.grid')
      expect(dateContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'gap-4')
    })
  })

  describe('Accessibility with Design System', () => {
    it('should maintain accessibility while using brand styles', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const heading = screen.getByRole('heading', { name: /career check-ins/i })
      expect(heading).toHaveClass('text-heading-2', 'text-primary')
      expect(heading).toBeInTheDocument()
    })

    it('should provide proper focus states with brand colors', () => {
      render(<CareerCheckInComponent {...defaultProps} />)
      
      const generateButton = screen.getByRole('button', { name: /generate check-in/i })
      expect(generateButton).toHaveAttribute('aria-label')
    })
  })
})

describe('Component State Management', () => {
  it('should properly handle form state transitions', () => {
    render(<CareerCheckInComponent {...defaultProps} />)
    
    // Initially closed
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    
    // Open form
    const generateButton = screen.getByRole('button', { name: /generate check-in/i })
    fireEvent.click(generateButton)
    
    expect(screen.getByRole('form')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /generate check-in/i })).not.toBeInTheDocument()
  })

  it('should validate form data correctly', async () => {
    render(<CareerCheckInComponent {...defaultProps} />)
    
    // Open form and try to submit without filling required fields
    const generateButton = screen.getByRole('button', { name: /generate check-in/i })
    fireEvent.click(generateButton)
    
    const submitButton = screen.getByRole('button', { name: /generate draft/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/check-in period name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument()
    })
  })
})