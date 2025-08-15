/**
 * Test suite for ManualReflectionGenerator component
 * Tests manual generation button functionality and user feedback
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManualReflectionGenerator } from '../../components/ManualReflectionGenerator'

// Mock the useManualReflectionGeneration hook
const mockGenerateReflection = jest.fn()
const mockUseManualReflectionGeneration = {
  isGenerating: false,
  error: null,
  generateReflection: mockGenerateReflection
}

jest.mock('../../hooks/useManualReflectionGeneration', () => ({
  useManualReflectionGeneration: () => mockUseManualReflectionGeneration
}))

// Mock getCurrentWeekNumber
jest.mock('../../lib/week-utils', () => ({
  getCurrentWeekNumber: () => 42
}))

// Mock the Tooltip component
jest.mock('../../components/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode, content: string }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  )
}))

describe('ManualReflectionGenerator', () => {
  const mockOnReflectionGenerated = jest.fn()
  const defaultProps = {
    onReflectionGenerated: mockOnReflectionGenerated,
    className: '',
    disabled: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseManualReflectionGeneration.isGenerating = false
    mockUseManualReflectionGeneration.error = null
    mockGenerateReflection.mockResolvedValue({ operationId: 'test-operation-123' })
  })

  describe('Rendering', () => {
    it('should render generate button with correct text', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Generate reflection for week 42/i })).toBeInTheDocument()
      expect(screen.getByText('Generate Reflection Now')).toBeInTheDocument()
    })

    it('should show helper text with current week', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      expect(screen.getByText(/Week 42/)).toBeInTheDocument()
      expect(screen.getByText(/integration data/)).toBeInTheDocument()
    })

    it('should show tooltip with helpful information', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toBeInTheDocument()
      expect(tooltip.getAttribute('title')).toContain('Uses your connected integrations')
    })

    it('should apply custom className', () => {
      render(<ManualReflectionGenerator {...defaultProps} className="custom-class" />)

      const container = screen.getByRole('button').closest('.custom-class')
      expect(container).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call generateReflection when button is clicked', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /Generate reflection for week 42/i })
      await user.click(generateButton)

      expect(mockGenerateReflection).toHaveBeenCalledWith()
    })

    it('should call onReflectionGenerated callback on success', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /Generate reflection for week 42/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(mockOnReflectionGenerated).toHaveBeenCalledWith('test-operation-123')
      })
    })

    it('should show success message after generation', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /Generate reflection for week 42/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/Reflection generation started!/)).toBeInTheDocument()
        expect(screen.getByText(/will appear in your list when ready/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    beforeEach(() => {
      mockUseManualReflectionGeneration.isGenerating = true
    })

    it('should show loading state while generating', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      expect(screen.getByText('Generating Reflection...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toHaveClass('cursor-wait')
    })

    it('should disable button while generating', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button')
      expect(generateButton).toBeDisabled()
    })

    it('should show progress indicator while generating', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      expect(screen.getByText('Generating reflection...')).toBeInTheDocument()
      expect(screen.getByText('~2 minutes')).toBeInTheDocument()
      
      // Check for progress bar
      const progressBar = screen.getByRole('progressbar', { hidden: true }) || 
                         document.querySelector('.animate-pulse')
      expect(progressBar).toBeInTheDocument()
    })

    it('should show loading spinner icon', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      const spinner = screen.getByRole('button').querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseManualReflectionGeneration.error = 'Generation failed: Server error'
    })

    it('should display error message', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      expect(screen.getByText('Generation failed')).toBeInTheDocument()
      expect(screen.getByText('Generation failed: Server error')).toBeInTheDocument()
    })

    it('should allow dismissing error message', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss error/i })
      await user.click(dismissButton)

      // Error should be cleared from local state
      expect(screen.queryByText('Generation failed: Server error')).not.toBeInTheDocument()
    })

    it('should handle generation failure gracefully', async () => {
      const user = userEvent.setup()
      mockGenerateReflection.mockRejectedValue(new Error('Network error'))
      mockUseManualReflectionGeneration.isGenerating = false
      mockUseManualReflectionGeneration.error = null

      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /Generate reflection for week 42/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      render(<ManualReflectionGenerator {...defaultProps} disabled={true} />)

      const generateButton = screen.getByRole('button')
      expect(generateButton).toBeDisabled()
      expect(generateButton).toHaveClass('cursor-not-allowed')
    })

    it('should not call generateReflection when disabled', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} disabled={true} />)

      const generateButton = screen.getByRole('button')
      await user.click(generateButton)

      expect(mockGenerateReflection).not.toHaveBeenCalled()
    })
  })

  describe('Success State Management', () => {
    it('should auto-hide success message after timeout', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /Generate reflection for week 42/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/Reflection generation started!/)).toBeInTheDocument()
      })

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(screen.queryByText(/Reflection generation started!/)).not.toBeInTheDocument()
      })

      jest.useRealTimers()
    })

    it('should clear success message when starting new generation', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /Generate reflection for week 42/i })
      
      // First generation
      await user.click(generateButton)
      await waitFor(() => {
        expect(screen.getByText(/Reflection generation started!/)).toBeInTheDocument()
      })

      // Second generation
      await user.click(generateButton)
      
      // Success message should be cleared when starting new generation
      expect(screen.queryByText(/Reflection generation started!/)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button')
      expect(generateButton).toHaveAttribute('aria-label', 'Generate reflection for week 42')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ManualReflectionGenerator {...defaultProps} />)

      const generateButton = screen.getByRole('button')
      
      // Tab to button
      await user.tab()
      expect(generateButton).toHaveFocus()
      
      // Press Enter
      await user.keyboard('{Enter}')
      expect(mockGenerateReflection).toHaveBeenCalled()
    })
  })
})