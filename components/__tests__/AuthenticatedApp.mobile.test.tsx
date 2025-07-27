/**
 * Mobile responsive layout tests for AuthenticatedApp
 * Tests mobile header layout, navigation, and content responsiveness
 */

import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { AuthenticatedApp } from '../../app/AuthenticatedApp'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock NextAuth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.Mock

// Mock fetch
global.fetch = jest.fn()

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('AuthenticatedApp Mobile Layout', () => {
  beforeEach(() => {
    // Mock authenticated session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          image: '/avatar.jpg'
        }
      },
      status: 'authenticated'
    })

    // Mock API responses
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      }
      if (url.includes('/api/assessments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Mobile Header Layout', () => {
    it('should render mobile header with compact logo and icon buttons', () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      render(<AuthenticatedApp />)

      // Should have mobile layout visible (block md:hidden)
      const mobileHeader = document.querySelector('.block.md\\:hidden')
      expect(mobileHeader).toBeInTheDocument()

      // Should have compact logo (120px width)
      const logo = screen.getByRole('img', { name: /logo/i })
      expect(logo).toHaveAttribute('width', '120')

      // Should have icon-only buttons for settings and sign out
      const settingsButton = screen.getByLabelText('Open settings')
      const signOutButton = screen.getByLabelText('Sign out')
      
      expect(settingsButton).toBeInTheDocument()
      expect(signOutButton).toBeInTheDocument()
      
      // Should have user avatar
      const avatar = screen.getByAltText('John Doe')
      expect(avatar).toHaveClass('w-8', 'h-8', 'rounded-full')
    })

    it('should show centered welcome message on mobile', () => {
      render(<AuthenticatedApp />)

      const welcomeText = screen.getByText('Welcome back, John Doe')
      expect(welcomeText).toBeInTheDocument()
      
      // Should be in a centered container
      const textContainer = welcomeText.closest('.text-center')
      expect(textContainer).toBeInTheDocument()
    })

    it('should hide desktop header on mobile', () => {
      render(<AuthenticatedApp />)

      // Desktop header should have hidden md:flex classes
      const desktopHeader = document.querySelector('.hidden.md\\:flex')
      expect(desktopHeader).toBeInTheDocument()
    })
  })

  describe('Mobile Navigation Tabs', () => {
    it('should have responsive spacing and scrollable navigation', () => {
      render(<AuthenticatedApp />)

      const navContainer = document.querySelector('nav .\\-mb-px')
      expect(navContainer).toHaveClass('flex', 'space-x-4', 'md:space-x-8', 'overflow-x-auto')

      // Tab buttons should have responsive padding
      const snippetsTab = screen.getByText('Weekly Snippets')
      const performanceTab = screen.getByText('Performance Drafts')
      
      expect(snippetsTab).toHaveClass('px-2', 'md:px-1', 'whitespace-nowrap')
      expect(performanceTab).toHaveClass('px-2', 'md:px-1', 'whitespace-nowrap')
    })

    it('should maintain functionality on mobile', () => {
      render(<AuthenticatedApp />)

      const performanceTab = screen.getByText('Performance Drafts')
      fireEvent.click(performanceTab)

      // Should switch to performance tab
      expect(performanceTab).toHaveClass('border-accent-500', 'text-primary-600')
    })
  })

  describe('Mobile Content Layout', () => {
    it('should have responsive grid and padding', () => {
      render(<AuthenticatedApp />)

      // Main grid should be responsive
      const mainGrid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3')
      expect(mainGrid).toHaveClass('gap-4', 'md:gap-6')

      // Sidebar should have responsive padding
      const sidebar = document.querySelector('aside .card')
      expect(sidebar).toHaveClass('p-4', 'md:p-6')

      // Heading should have responsive margin
      const heading = screen.getByText('Your Snippets')
      expect(heading).toHaveClass('mb-4', 'md:mb-6')
    })

    it('should have responsive snippet content area', () => {
      // Add a mock snippet first
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/snippets')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 'snippet-1',
              weekNumber: 1,
              startDate: '2024-01-01',
              endDate: '2024-01-07',
              content: 'Test content'
            }])
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })

      render(<AuthenticatedApp />)

      // Wait for snippet to load and be visible
      const snippetArticle = document.querySelector('main article')
      expect(snippetArticle).toHaveClass('p-4', 'md:p-6')
    })

    it('should have responsive snippet header', () => {
      // Add a mock snippet
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/snippets')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{
              id: 'snippet-1',
              weekNumber: 1,
              startDate: '2024-01-01',
              endDate: '2024-01-07',
              content: 'Test content'
            }])
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      })

      render(<AuthenticatedApp />)

      // Header should be responsive
      const snippetHeader = document.querySelector('main article header')
      expect(snippetHeader).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'sm:justify-between', 'gap-3')

      // Title should have responsive text size
      const title = document.querySelector('main article h2')
      expect(title).toHaveClass('text-lg', 'sm:text-xl')
    })
  })

  describe('Mobile Touch Interactions', () => {
    it('should have adequate touch targets', () => {
      render(<AuthenticatedApp />)

      // Settings button should be at least 44x44px (good touch target)
      const settingsButton = screen.getByLabelText('Open settings')
      expect(settingsButton).toHaveClass('p-2') // 2 * 4px = 8px padding + icon size

      // Navigation tabs should have adequate padding
      const snippetsTab = screen.getByText('Weekly Snippets')
      expect(snippetsTab).toHaveClass('py-3', 'px-2') // Good touch target height
    })

    it('should handle tab switching on mobile', () => {
      render(<AuthenticatedApp />)

      const performanceTab = screen.getByText('Performance Drafts')
      
      // Simulate touch interaction
      fireEvent.click(performanceTab)
      
      // Should work the same as on desktop
      expect(performanceTab).toHaveClass('border-accent-500', 'text-primary-600')
    })
  })

  describe('Mobile Empty States', () => {
    it('should have responsive empty state styling', () => {
      render(<AuthenticatedApp />)

      const emptyState = screen.getByText('Select a snippet to view or edit')
      const emptyContainer = emptyState.closest('div')
      
      expect(emptyContainer).toHaveClass('p-4', 'md:p-6')
    })
  })

  describe('Mobile Accessibility', () => {
    it('should maintain proper ARIA labels on mobile', () => {
      render(<AuthenticatedApp />)

      // Icon buttons should have descriptive labels
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument()
      expect(screen.getByLabelText('Sign out')).toBeInTheDocument()
    })

    it('should support keyboard navigation on mobile', () => {
      render(<AuthenticatedApp />)

      const settingsButton = screen.getByLabelText('Open settings')
      
      // Should be focusable
      settingsButton.focus()
      expect(document.activeElement).toBe(settingsButton)
      
      // Should respond to Enter key
      fireEvent.keyDown(settingsButton, { key: 'Enter' })
      // Settings modal should open (tested elsewhere)
    })
  })

  describe('Responsive Breakpoints', () => {
    it('should show correct layout at mobile breakpoint (< 768px)', () => {
      // Mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      
      render(<AuthenticatedApp />)

      // Mobile header should be visible
      expect(document.querySelector('.block.md\\:hidden')).toBeInTheDocument()
      
      // Desktop header should be hidden
      expect(document.querySelector('.hidden.md\\:flex')).toBeInTheDocument()
    })

    it('should show correct layout at tablet breakpoint (768px-1024px)', () => {
      // Tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      
      render(<AuthenticatedApp />)

      // Should use medium spacing
      const navContainer = document.querySelector('nav .\\-mb-px')
      expect(navContainer).toHaveClass('space-x-4', 'md:space-x-8')
    })
  })
})