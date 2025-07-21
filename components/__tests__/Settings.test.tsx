/**
 * Settings Component Tests
 * 
 * Comprehensive test suite for the Settings component including:
 * - Form validation and submission
 * - File upload functionality
 * - Error handling
 * - Accessibility compliance
 * - User interaction flows
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../Settings'
import { VALIDATION_MESSAGES, ARIA_LABELS } from '../../constants/settings'
import type { PerformanceSettings } from '../../types/settings'

// Mock the Tooltip component
jest.mock('../Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  )
}))

// Mock file upload hook
jest.mock('../../hooks/useFileUpload', () => ({
  useFileUpload: ({ onSuccess, onError, onClear }: any) => ({
    handleFileChange: jest.fn((event) => {
      const file = event.target.files?.[0]
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          onError?.('File size must be less than 10MB')
          return { file: null, error: 'File size must be less than 10MB' }
        }
        onSuccess?.(file)
        return { file, error: null }
      }
      onClear?.()
      return { file: null, error: null }
    }),
    clearFile: jest.fn((inputRef) => {
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      onClear?.()
    }),
    formatFileSize: jest.fn((bytes) => `${bytes} bytes`),
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'text/plain']
  })
}))

describe('Settings Component', () => {
  const mockOnSave = jest.fn()
  const mockOnClose = jest.fn()

  const defaultProps = {
    onSave: mockOnSave,
    onClose: mockOnClose
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<Settings {...defaultProps} />)

      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/seniority level/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/career ladder document/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/previous performance feedback/i)).toBeInTheDocument()
    })

    it('should show required field indicators', () => {
      render(<Settings {...defaultProps} />)

      expect(screen.getByText('Job Title')).toBeInTheDocument()
      expect(screen.getByText('Seniority Level')).toBeInTheDocument()
      expect(screen.getAllByText('*')).toHaveLength(2)
    })

    it('should render with initial settings', () => {
      const initialSettings: Partial<PerformanceSettings> = {
        jobTitle: 'Senior Developer',
        seniorityLevel: 'Senior',
        performanceFeedback: 'Great work this year'
      }

      render(<Settings {...defaultProps} initialSettings={initialSettings} />)

      expect(screen.getByDisplayValue('Senior Developer')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Senior')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Great work this year')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup()
      render(<Settings {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(screen.getByText(VALIDATION_MESSAGES.JOB_TITLE_REQUIRED)).toBeInTheDocument()
      expect(screen.getByText(VALIDATION_MESSAGES.SENIORITY_LEVEL_REQUIRED)).toBeInTheDocument()
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should clear validation errors when user types', async () => {
      const user = userEvent.setup()
      render(<Settings {...defaultProps} />)

      // Trigger validation errors
      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(screen.getByText(VALIDATION_MESSAGES.JOB_TITLE_REQUIRED)).toBeInTheDocument()

      // Type in job title field
      const jobTitleInput = screen.getByLabelText(/job title/i)
      await user.type(jobTitleInput, 'Developer')

      expect(screen.queryByText(VALIDATION_MESSAGES.JOB_TITLE_REQUIRED)).not.toBeInTheDocument()
    })

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValueOnce(undefined)

      render(<Settings {...defaultProps} />)

      await user.type(screen.getByLabelText(/job title/i), 'Senior Developer')
      await user.type(screen.getByLabelText(/seniority level/i), 'Senior')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          jobTitle: 'Senior Developer',
          seniorityLevel: 'Senior',
          careerLadderFile: null,
          performanceFeedback: '',
          performanceFeedbackFile: null
        })
      })
    })
  })

  describe('File Upload', () => {
    it('should handle career ladder file upload', async () => {
      const user = userEvent.setup()
      render(<Settings {...defaultProps} />)

      const file = new File(['content'], 'career-ladder.pdf', { type: 'application/pdf' })
      const fileInput = screen.getAllByRole('button', { name: /choose file|upload/i })[0]
      
      await user.click(fileInput)
      
      // Simulate file selection (this would normally trigger the file input)
      // In a real test environment, you would need to handle the file input differently
    })

    it('should show file upload errors', async () => {
      render(<Settings {...defaultProps} />)
      
      // This would test file validation errors
      // Implementation depends on how file inputs are handled in tests
    })

    it('should remove uploaded files', async () => {
      const user = userEvent.setup()
      const initialSettings: Partial<PerformanceSettings> = {
        careerLadderFile: new File(['content'], 'test.pdf', { type: 'application/pdf' })
      }

      render(<Settings {...defaultProps} initialSettings={initialSettings} />)

      // File should be displayed
      expect(screen.getByText('test.pdf')).toBeInTheDocument()

      // Click remove button
      const removeButton = screen.getByLabelText(ARIA_LABELS.REMOVE_FILE)
      await user.click(removeButton)

      // File should be removed
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
    })
  })

  describe('Performance Feedback Priority', () => {
    it('should show priority indicator when file is uploaded', () => {
      const initialSettings: Partial<PerformanceSettings> = {
        performanceFeedbackFile: new File(['content'], 'feedback.pdf', { type: 'application/pdf' }),
        performanceFeedback: 'Some text feedback'
      }

      render(<Settings {...defaultProps} initialSettings={initialSettings} />)

      expect(screen.getByText(/file uploaded - text will be ignored/i)).toBeInTheDocument()
    })

    it('should dim text area when file is uploaded', () => {
      const initialSettings: Partial<PerformanceSettings> = {
        performanceFeedbackFile: new File(['content'], 'feedback.pdf', { type: 'application/pdf' })
      }

      render(<Settings {...defaultProps} initialSettings={initialSettings} />)

      const textarea = screen.getByLabelText(/previous performance feedback/i)
      expect(textarea).toHaveClass('opacity-60')
    })
  })

  describe('Error Handling', () => {
    it('should display submit errors', async () => {
      const user = userEvent.setup()
      const error = new Error('Network error')
      mockOnSave.mockRejectedValueOnce(error)

      render(<Settings {...defaultProps} />)

      await user.type(screen.getByLabelText(/job title/i), 'Developer')
      await user.type(screen.getByLabelText(/seniority level/i), 'Senior')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnSave.mockReturnValueOnce(savePromise)

      render(<Settings {...defaultProps} />)

      await user.type(screen.getByLabelText(/job title/i), 'Developer')
      await user.type(screen.getByLabelText(/seniority level/i), 'Senior')

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(saveButton).toBeDisabled()

      resolvePromise!()
      await waitFor(() => {
        expect(screen.getByText('Save Settings')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Settings {...defaultProps} />)

      expect(screen.getByLabelText(ARIA_LABELS.CLOSE_SETTINGS)).toBeInTheDocument()
    })

    it('should associate errors with form fields', async () => {
      const user = userEvent.setup()
      render(<Settings {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save settings/i })
      await user.click(saveButton)

      const jobTitleInput = screen.getByLabelText(/job title/i)
      expect(jobTitleInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'))
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<Settings {...defaultProps} />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/job title/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/seniority level/i)).toHaveFocus()
    })
  })

  describe('Unsaved Changes Warning', () => {
    it('should warn about unsaved changes when closing', async () => {
      const user = userEvent.setup()
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      render(<Settings {...defaultProps} />)

      // Make changes to form
      await user.type(screen.getByLabelText(/job title/i), 'Developer')

      // Try to close
      const closeButton = screen.getByLabelText(ARIA_LABELS.CLOSE_SETTINGS)
      await user.click(closeButton)

      expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?')
      expect(mockOnClose).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('should close without warning when no changes made', async () => {
      const user = userEvent.setup()
      render(<Settings {...defaultProps} />)

      const closeButton = screen.getByLabelText(ARIA_LABELS.CLOSE_SETTINGS)
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})