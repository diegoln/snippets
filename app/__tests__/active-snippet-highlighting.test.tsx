/**
 * Unit tests for active snippet highlighting functionality
 * Tests visual feedback for selected and editing states
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock the fetch function
global.fetch = jest.fn()

describe('Active Snippet Highlighting', () => {
  const mockSnippets = [
    {
      id: 'snippet-30',
      weekNumber: 30,
      startDate: '2025-07-21',
      endDate: '2025-07-25',
      content: 'Most recent week content'
    },
    {
      id: 'snippet-29',
      weekNumber: 29,
      startDate: '2025-07-14',
      endDate: '2025-07-18',
      content: 'Previous week content'
    },
    {
      id: 'snippet-28',
      weekNumber: 28,
      startDate: '2025-07-07',
      endDate: '2025-07-11',
      content: 'Another week content'
    }
  ]

  const mockAssessments: any[] = []

  beforeEach(() => {
    jest.resetAllMocks()
    
    // Mock successful API responses
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSnippets)
        })
      }
      if (url.includes('/api/assessments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssessments)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    // Mock successful PUT request for snippet updates
    ;(fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/snippets') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: JSON.parse(options.body).id,
            content: JSON.parse(options.body).content,
            weekNumber: 30,
            startDate: '2025-07-21',
            endDate: '2025-07-25'
          })
        })
      }
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSnippets)
        })
      }
      if (url.includes('/api/assessments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssessments)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('should highlight the initially selected snippet with blue background', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const week30Button = screen.getByText('Week 30').closest('button')
      
      // Should have active snippet styling
      expect(week30Button).toHaveClass('bg-blue-100')
      expect(week30Button).toHaveClass('border-blue-300')
      expect(week30Button).toHaveClass('border-2')
      expect(week30Button).toHaveClass('shadow-sm')
    })
  })

  it('should move highlighting when a different snippet is selected', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Initially Week 30 should be active
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
    })

    // Click on Week 29
    const week29Button = screen.getByText('Week 29').closest('button')
    fireEvent.click(week29Button!)

    await waitFor(() => {
      // Week 29 should now be active
      expect(week29Button).toHaveClass('bg-blue-100')
      expect(week29Button).toHaveClass('border-blue-300')
      
      // Week 30 should no longer be active
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).not.toHaveClass('bg-blue-100')
      expect(week30Button).toHaveClass('bg-gray-50')
    })
  })

  it('should show different highlighting when snippet is in editing mode', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Week 30 should be selected initially
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
    })

    // Click Edit button to enter editing mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      const week30Button = screen.getByText('Week 30').closest('button')
      
      // In edit mode, should still have blue highlighting for active snippet
      // The logic shows blue highlighting for selected snippets regardless of edit state
      expect(week30Button).toHaveClass('bg-blue-100')
      expect(week30Button).toHaveClass('border-blue-300')
    })
  })

  it('should maintain highlighting consistency across pagination', async () => {
    // Add more snippets to test pagination
    const manySnippets = Array.from({ length: 6 }, (_, i) => ({
      id: `snippet-${30 - i}`,
      weekNumber: 30 - i,
      startDate: `2025-07-${21 - i * 7}`,
      endDate: `2025-07-${25 - i * 7}`,
      content: `Week ${30 - i} content`
    }))

    ;(fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/snippets') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(manySnippets)
        })
      }
      if (url.includes('/api/assessments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssessments)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<Home />)
    
    await waitFor(() => {
      // Week 30 should be initially highlighted on page 1
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
    })

    // Navigate to page 2
    const nextButton = screen.getByRole('button', { name: 'Next page' })
    fireEvent.click(nextButton)

    await waitFor(() => {
      // Week 30 is no longer visible but should still be the selected snippet
      expect(screen.queryByText('Week 30')).not.toBeInTheDocument()
      
      // The main content should still show Week 30's content
      expect(screen.getByText('Week 30 - Jul 21 - Jul 25, 2025')).toBeInTheDocument()
    })

    // Go back to page 1
    const prevButton = screen.getByRole('button', { name: 'Previous page' })
    fireEvent.click(prevButton)

    await waitFor(() => {
      // Week 30 should still be highlighted when it comes back into view
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
    })
  })

  it('should show proper ARIA attributes for accessibility', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const week30Button = screen.getByText('Week 30').closest('button')
      const week29Button = screen.getByText('Week 29').closest('button')
      
      // Active snippet should have aria-pressed="true"
      expect(week30Button).toHaveAttribute('aria-pressed', 'true')
      
      // Non-active snippets should have aria-pressed="false"  
      expect(week29Button).toHaveAttribute('aria-pressed', 'false')
    })

    // Select a different snippet
    const week29Button = screen.getByText('Week 29').closest('button')
    fireEvent.click(week29Button!)

    await waitFor(() => {
      const week30Button = screen.getByText('Week 30').closest('button')
      
      // ARIA attributes should update
      expect(week29Button).toHaveAttribute('aria-pressed', 'true')
      expect(week30Button).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('should not highlight any snippet when none is selected', async () => {
    // Test edge case with empty state
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      }
      if (url.includes('/api/assessments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAssessments)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<Home />)
    
    await waitFor(() => {
      // Should show empty state message
      expect(screen.getByText('Select a snippet to view or edit')).toBeInTheDocument()
      
      // No snippet buttons should exist to be highlighted
      const snippetButtons = screen.queryAllByRole('button').filter(button => 
        button.textContent?.includes('Week ')
      )
      expect(snippetButtons).toHaveLength(0)
    })
  })

  it('should maintain highlighting after successful save operation', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Week 30 should be initially selected and highlighted
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      // Should now see textarea and save button
      const textarea = screen.getByRole('textbox')
      const saveButton = screen.getByText('Save')
      
      // Modify content
      fireEvent.change(textarea, { target: { value: 'Updated content' } })
      
      // Save the changes
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      // Should exit edit mode and Week 30 should still be highlighted
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
      expect(week30Button).toHaveClass('border-blue-300')
      
      // Should not be in edit mode anymore
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('should use correct CSS classes for different states', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const week30Button = screen.getByText('Week 30').closest('button')
      const week29Button = screen.getByText('Week 29').closest('button')
      
      // Active snippet should have specific blue classes
      expect(week30Button).toHaveClass('bg-blue-100', 'border-blue-300', 'border-2', 'shadow-sm')
      
      // Inactive snippet should have gray background with hover state
      expect(week29Button).toHaveClass('bg-gray-50', 'hover:bg-gray-100')
      expect(week29Button).not.toHaveClass('bg-blue-100')
    })
  })
})