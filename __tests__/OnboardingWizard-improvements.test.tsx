/**
 * Tests for OnboardingWizard UX improvements
 * Tests debounced localStorage, error handling, and accessibility features
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/OnboardingWizard'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/lib/week-utils', () => ({
  getCurrentWeekNumber: () => 30,
}))
jest.mock('@/lib/utils', () => ({
  getWeekDates: () => ({
    startDate: new Date('2025-07-21'),
    endDate: new Date('2025-07-25'),
  }),
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('OnboardingWizard UX Improvements', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as any)
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any)
    
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Progress Persistence', () => {
    it('should debounce localStorage saves', async () => {
      render(<OnboardingWizard />)
      
      // Select role and level quickly
      fireEvent.click(screen.getByText('Engineer'))
      fireEvent.click(screen.getByText('Senior'))
      
      // localStorage should not be called immediately
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
      
      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(500)
      })
      
      // Now localStorage should have been called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'onboarding-progress',
        expect.stringContaining('"role":"engineer"')
      )
    })

    it('should restore progress from localStorage', () => {
      const savedProgress = {
        step: 1,
        data: { role: 'engineer', level: 'senior', reflectionContent: '' },
        integrations: ['google_calendar'],
        bullets: { google_calendar: ['Test bullet'] },
        timestamp: Date.now(),
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedProgress))
      
      render(<OnboardingWizard />)
      
      // Should restore to step 1 (integrations step)
      expect(screen.getByText('Connect an integration')).toBeInTheDocument()
      
      // Should show connected integration
      expect(screen.getByText('✓ Connected')).toBeInTheDocument()
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      render(<OnboardingWizard />)
      
      // Should start from beginning despite corrupted data
      expect(screen.getByText('Tell us about your role')).toBeInTheDocument()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore onboarding progress:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for role selection', () => {
      render(<OnboardingWizard />)
      
      const roleGroup = screen.getByRole('radiogroup', { name: /what's your role/i })
      expect(roleGroup).toBeInTheDocument()
      
      const engineerOption = screen.getByRole('radio', { name: /engineer/i })
      expect(engineerOption).toHaveAttribute('aria-checked', 'false')
      
      fireEvent.click(engineerOption)
      expect(engineerOption).toHaveAttribute('aria-checked', 'true')
    })

    it('should have proper ARIA labels for level selection', () => {
      render(<OnboardingWizard />)
      
      const levelGroup = screen.getByRole('radiogroup', { name: /what's your level/i })
      expect(levelGroup).toBeInTheDocument()
      
      const seniorOption = screen.getByRole('radio', { name: /senior/i })
      expect(seniorOption).toHaveAttribute('aria-checked', 'false')
      
      fireEvent.click(seniorOption)
      expect(seniorOption).toHaveAttribute('aria-checked', 'true')
    })

    it('should have focus management for keyboard navigation', () => {
      render(<OnboardingWizard />)
      
      const engineerButton = screen.getByRole('radio', { name: /engineer/i })
      
      // Focus should be manageable
      engineerButton.focus()
      expect(engineerButton).toHaveFocus()
      
      // Should have visible focus styles
      expect(engineerButton).toHaveClass('focus:ring-2', 'focus:ring-accent-500')
    })
  })

  describe('Enhanced Loading States', () => {
    it('should show specific loading messages during save', async () => {
      // Mock successful API responses
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'snippet-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      render(<OnboardingWizard />)
      
      // Complete first two steps
      fireEvent.click(screen.getByText('Engineer'))
      fireEvent.click(screen.getByText('Senior'))
      fireEvent.click(screen.getByText('Continue →'))
      
      // Connect an integration
      fireEvent.click(screen.getByText('Connect'))
      
      // Fast-forward past connection delay
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue →'))
      })
      
      // Should be on review step
      expect(screen.getByText('Review your first reflection')).toBeInTheDocument()
      
      // Start save process
      fireEvent.click(screen.getByText('Save Reflection'))
      
      // Should show first loading message
      expect(screen.getByText('Saving your profile...')).toBeInTheDocument()
    })
  })

  describe('Mock Data Safety', () => {
    it('should not use mock data in production environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      render(<OnboardingWizard />)
      
      // Connect an integration - should not get mock bullets in production
      fireEvent.click(screen.getByText('Engineer'))
      fireEvent.click(screen.getByText('Senior'))
      fireEvent.click(screen.getByText('Continue →'))
      fireEvent.click(screen.getByText('Connect'))
      
      act(() => {
        jest.advanceTimersByTime(1000)
      })
      
      // Should not have any mock bullets
      fireEvent.click(screen.getByText('Continue →'))
      
      const textarea = screen.getByRole('textbox')
      expect(textarea.value).not.toContain('Led architecture review meeting')
      
      process.env.NODE_ENV = originalEnv
    })
  })
})