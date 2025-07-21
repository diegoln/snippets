/**
 * Unit Tests for Home Page Component
 * 
 * This file contains comprehensive tests for the main Home page component
 * including user interactions, state management, and accessibility features.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '../page'

// Mock the utils module
jest.mock('../../lib/utils', () => ({
  getCurrentWeek: jest.fn(() => 30),
  formatDateRange: jest.fn((start, end) => 'Jul 21 - Jul 25'),
}))

describe('Home Page Component', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<Home />)
      
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Weekly Snippets')
    })

    it('should render snippets sidebar', () => {
      render(<Home />)
      
      const sidebar = screen.getByText('Your Snippets')
      expect(sidebar).toBeInTheDocument()
    })

    it('should render mock snippets', async () => {
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
        expect(screen.getByText('Week 29')).toBeInTheDocument()
      })
    })

    it('should show empty state initially', () => {
      render(<Home />)
      
      const emptyState = screen.getByText('Select a snippet to view or edit')
      expect(emptyState).toBeInTheDocument()
    })
  })

  describe('Snippet Selection', () => {
    it('should select snippet when clicked', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      // Should show snippet content
      expect(screen.queryByText('Select a snippet to view or edit')).not.toBeInTheDocument()
    })

    it('should show edit button when snippet is selected', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      expect(editButton).toBeInTheDocument()
    })

    it('should highlight selected snippet', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippetButton = screen.getByRole('button', { name: /Week 30/i })
      await user.click(snippetButton)
      
      expect(snippetButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      // Wait for snippets to load and select first one
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      // Should show textarea
      const textarea = screen.getByRole('textbox', { name: /snippet content editor/i })
      expect(textarea).toBeInTheDocument()
      
      // Should show save and cancel buttons
      expect(screen.getByRole('button', { name: /save snippet changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument()
    })

    it('should show cancel text on edit button when in edit mode', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument()
    })

    it('should exit edit mode when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      const cancelButton = screen.getByRole('button', { name: /cancel editing/i })
      await user.click(cancelButton)
      
      // Should be back to view mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit snippet/i })).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('should save content when save button is clicked', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      const textarea = screen.getByRole('textbox', { name: /snippet content editor/i })
      await user.clear(textarea)
      await user.type(textarea, 'Updated content for testing')
      
      const saveButton = screen.getByRole('button', { name: /save snippet changes/i })
      await user.click(saveButton)
      
      // Should exit edit mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      
      // Should show updated content
      expect(screen.getByText('Updated content for testing')).toBeInTheDocument()
    })

    it('should update snippet content in state after save', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      const textarea = screen.getByRole('textbox', { name: /snippet content editor/i })
      await user.clear(textarea)
      await user.type(textarea, 'New content')
      
      const saveButton = screen.getByRole('button', { name: /save snippet changes/i })
      await user.click(saveButton)
      
      // Enter edit mode again to verify content persisted
      const editButton2 = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton2)
      
      const textarea2 = screen.getByRole('textbox', { name: /snippet content editor/i })
      expect(textarea2).toHaveValue('New content')
    })
  })

  describe('Snippet Switching', () => {
    it('should exit edit mode when switching snippets', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
        expect(screen.getByText('Week 29')).toBeInTheDocument()
      })
      
      // Select first snippet and enter edit mode
      const snippet30 = screen.getByText('Week 30')
      await user.click(snippet30)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      // Verify edit mode
      expect(screen.getByRole('textbox', { name: /snippet content editor/i })).toBeInTheDocument()
      
      // Switch to second snippet
      const snippet29 = screen.getByText('Week 29')
      await user.click(snippet29)
      
      // Should exit edit mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should show different content for different snippets', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
        expect(screen.getByText('Week 29')).toBeInTheDocument()
      })
      
      // Select first snippet
      const snippet30 = screen.getByText('Week 30')
      await user.click(snippet30)
      
      // Should show first snippet content
      const content30 = screen.getByText(/This week I worked on the user authentication system/)
      expect(content30).toBeInTheDocument()
      
      // Switch to second snippet
      const snippet29 = screen.getByText('Week 29')
      await user.click(snippet29)
      
      // Should show second snippet content
      const content29 = screen.getByText(/Focused on database schema design/)
      expect(content29).toBeInTheDocument()
      
      // First snippet content should not be visible
      expect(screen.queryByText(/This week I worked on the user authentication system/)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Home />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toBeInTheDocument()
      
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toBeInTheDocument()
    })

    it('should have proper button labels', async () => {
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      // Add new week button should have proper label
      const addButton = screen.getByRole('button', { name: /add current week snippet/i })
      expect(addButton).toBeInTheDocument()
    })

    it('should have proper form controls', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      const textarea = screen.getByRole('textbox', { name: /snippet content editor/i })
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('aria-label')
    })

    it('should have proper navigation semantics', () => {
      render(<Home />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      
      const aside = screen.getByRole('complementary')
      expect(aside).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty snippet content gracefully', async () => {
      const user = userEvent.setup()
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('Week 30')).toBeInTheDocument()
      })
      
      const snippet = screen.getByText('Week 30')
      await user.click(snippet)
      
      const editButton = screen.getByRole('button', { name: /edit snippet/i })
      await user.click(editButton)
      
      const textarea = screen.getByRole('textbox', { name: /snippet content editor/i })
      await user.clear(textarea)
      
      const saveButton = screen.getByRole('button', { name: /save snippet changes/i })
      await user.click(saveButton)
      
      // Should still work (component should handle empty content)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should maintain state when no snippet is selected', () => {
      render(<Home />)
      
      // Should show empty state
      const emptyState = screen.getByText('Select a snippet to view or edit')
      expect(emptyState).toBeInTheDocument()
      
      // Should not show edit button
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })
  })
})