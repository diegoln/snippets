/**
 * Test suite for ReflectionPreferences component
 * Tests user interactions, form validation, and API integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReflectionPreferencesComponent } from '../../components/ReflectionPreferences'
import { DEFAULT_REFLECTION_PREFERENCES } from '../../types/reflection-preferences'

// Mock the timezone constants
jest.mock('../../constants/timezones', () => ({
  COMMON_TIMEZONES: [
    { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 'UTC+0/+1' }
  ],
  getDetectedTimezone: jest.fn(() => 'America/New_York'),
  formatTimezoneDisplay: jest.fn((tz) => `Current timezone: ${tz}`)
}))

// Mock the Tooltip component
jest.mock('../../components/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode, content: string }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  )
}))

describe('ReflectionPreferencesComponent', () => {
  const mockOnSave = jest.fn()
  const defaultProps = {
    onSave: mockOnSave,
    initialPreferences: DEFAULT_REFLECTION_PREFERENCES,
    availableIntegrations: ['google_calendar', 'github'],
    isLoading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all form elements', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      // Auto-generation toggle
      expect(screen.getByLabelText(/Enable Automatic Reflection Generation/i)).toBeInTheDocument()
      
      // Day selection
      expect(screen.getByText('Preferred Day')).toBeInTheDocument()
      expect(screen.getByText('Monday')).toBeInTheDocument()
      expect(screen.getByText('Friday')).toBeInTheDocument()
      expect(screen.getByText('Sunday')).toBeInTheDocument()
      
      // Time selection
      expect(screen.getByLabelText('Preferred Time')).toBeInTheDocument()
      
      // Timezone selection
      expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
      
      // Save button
      expect(screen.getByRole('button', { name: /Save Preferences/i })).toBeInTheDocument()
    })

    it('should show schedule options when auto-generation is enabled', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      expect(screen.getByText('Schedule Preferences')).toBeInTheDocument()
      expect(screen.getByText('Preferred Day')).toBeInTheDocument()
      expect(screen.getByLabelText('Preferred Time')).toBeInTheDocument()
    })

    it('should hide schedule options when auto-generation is disabled', () => {
      const props = {
        ...defaultProps,
        initialPreferences: {
          ...DEFAULT_REFLECTION_PREFERENCES,
          autoGenerate: false
        }
      }
      
      render(<ReflectionPreferencesComponent {...props} />)

      expect(screen.queryByText('Schedule Preferences')).not.toBeInTheDocument()
      expect(screen.queryByText('Preferred Day')).not.toBeInTheDocument()
    })

    it('should show integration options when available', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      expect(screen.getByText('Include Data From')).toBeInTheDocument()
      expect(screen.getByText('Google calendar')).toBeInTheDocument()
      expect(screen.getByText('Github')).toBeInTheDocument()
    })

    it('should show notification options when auto-generation is enabled', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      expect(screen.getByLabelText(/Email me when reflection is ready/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should toggle auto-generation', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const autoGenerateCheckbox = screen.getByLabelText(/Enable Automatic Reflection Generation/i)
      
      // Should be checked by default
      expect(autoGenerateCheckbox).toBeChecked()
      
      // Click to disable
      await user.click(autoGenerateCheckbox)
      expect(autoGenerateCheckbox).not.toBeChecked()
      
      // Schedule options should be hidden
      expect(screen.queryByText('Schedule Preferences')).not.toBeInTheDocument()
    })

    it('should select preferred day', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const mondayOption = screen.getByDisplayValue('monday')
      await user.click(mondayOption)
      
      expect(mondayOption).toBeChecked()
    })

    it('should change preferred hour', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const timeSelect = screen.getByLabelText('Preferred Time')
      await user.selectOptions(timeSelect, '9')
      
      expect(timeSelect).toHaveValue('9')
    })

    it('should change timezone', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const timezoneSelect = screen.getByLabelText('Timezone')
      await user.selectOptions(timezoneSelect, 'America/Los_Angeles')
      
      expect(timezoneSelect).toHaveValue('America/Los_Angeles')
    })

    it('should toggle integration selections', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const calendarCheckbox = screen.getByRole('checkbox', { name: /google calendar/i })
      const githubCheckbox = screen.getByRole('checkbox', { name: /github/i })
      
      // Both should be unchecked initially
      expect(calendarCheckbox).not.toBeChecked()
      expect(githubCheckbox).not.toBeChecked()
      
      // Select calendar integration
      await user.click(calendarCheckbox)
      expect(calendarCheckbox).toBeChecked()
      
      // Select github integration
      await user.click(githubCheckbox)
      expect(githubCheckbox).toBeChecked()
    })

    it('should toggle notification preference', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const notificationCheckbox = screen.getByLabelText(/Email me when reflection is ready/i)
      
      // Should be unchecked by default
      expect(notificationCheckbox).not.toBeChecked()
      
      // Click to enable
      await user.click(notificationCheckbox)
      expect(notificationCheckbox).toBeChecked()
    })
  })

  describe('Form Submission', () => {
    it('should call onSave with correct data', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      // Make some changes
      const mondayOption = screen.getByDisplayValue('monday')
      await user.click(mondayOption)
      
      const timeSelect = screen.getByLabelText('Preferred Time')
      await user.selectOptions(timeSelect, '9')
      
      const calendarCheckbox = screen.getByRole('checkbox', { name: /google calendar/i })
      await user.click(calendarCheckbox)
      
      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          autoGenerate: true,
          preferredDay: 'monday',
          preferredHour: 9,
          timezone: 'America/New_York',
          includeIntegrations: ['google_calendar'],
          notifyOnGeneration: false
        })
      })
    })

    it('should disable save button while submitting', async () => {
      const user = userEvent.setup()
      const slowOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(
        <ReflectionPreferencesComponent 
          {...defaultProps} 
          onSave={slowOnSave}
        />
      )

      const saveButton = screen.getByRole('button', { name: /Save Preferences/i })
      await user.click(saveButton)

      // Button should show "Saving..." and be disabled
      expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled()
    })

    it('should show error on save failure', async () => {
      const user = userEvent.setup()
      const failingOnSave = jest.fn().mockRejectedValue(new Error('Save failed'))
      
      render(
        <ReflectionPreferencesComponent 
          {...defaultProps} 
          onSave={failingOnSave}
        />
      )

      const saveButton = screen.getByRole('button', { name: /Save Preferences/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument()
      })
    })

    it('should disable save when no changes made', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /Save Preferences/i })
      expect(saveButton).toBeDisabled()
    })

    it('should enable save when changes are made', async () => {
      const user = userEvent.setup()
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /Save Preferences/i })
      expect(saveButton).toBeDisabled()

      // Make a change
      const mondayOption = screen.getByDisplayValue('monday')
      await user.click(mondayOption)

      expect(saveButton).toBeEnabled()
    })
  })

  describe('Loading States', () => {
    it('should disable form elements when loading', () => {
      render(
        <ReflectionPreferencesComponent 
          {...defaultProps} 
          isLoading={true}
        />
      )

      const autoGenerateCheckbox = screen.getByLabelText(/Enable Automatic Reflection Generation/i)
      expect(autoGenerateCheckbox).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      expect(screen.getByLabelText('Preferred Time')).toBeInTheDocument()
      expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
    })

    it('should show tooltips with helpful information', () => {
      render(<ReflectionPreferencesComponent {...defaultProps} />)

      const tooltips = screen.getAllByTestId('tooltip')
      expect(tooltips.length).toBeGreaterThan(0)
      
      // Check that tooltips have meaningful content
      tooltips.forEach(tooltip => {
        expect(tooltip.getAttribute('title')).toBeTruthy()
      })
    })
  })

  describe('Integration with Initial Data', () => {
    it('should populate form with initial preferences', () => {
      const customPreferences = {
        autoGenerate: false,
        preferredDay: 'monday' as const,
        preferredHour: 9,
        timezone: 'America/Los_Angeles',
        includeIntegrations: ['github'],
        notifyOnGeneration: true
      }

      render(
        <ReflectionPreferencesComponent 
          {...defaultProps}
          initialPreferences={customPreferences}
        />
      )

      // Check that form is populated correctly
      expect(screen.getByLabelText(/Enable Automatic Reflection Generation/i)).not.toBeChecked()
      expect(screen.getByDisplayValue('monday')).toBeChecked()
      expect(screen.getByDisplayValue('9')).toBeInTheDocument()
      expect(screen.getByDisplayValue('America/Los_Angeles')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /github/i })).toBeChecked()
    })
  })
})