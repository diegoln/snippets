/**
 * Unit tests for snippet ordering functionality
 * Tests that snippets are displayed in reverse chronological order (most recent first)
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock the fetch function
global.fetch = jest.fn()

describe('Snippet Ordering', () => {
  const mockSnippetsChronological = [
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
      content: 'Week before that content'
    },
    {
      id: 'snippet-27',
      weekNumber: 27,
      startDate: '2025-06-30',
      endDate: '2025-07-04',
      content: 'Older week content'
    }
  ]

  const mockAssessments: any[] = []

  beforeEach(() => {
    jest.resetAllMocks()
    
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSnippetsChronological)
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

  it('should display snippets in reverse chronological order (most recent first)', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const snippetButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Week ')
      )
      
      // Check that weeks appear in descending order
      expect(snippetButtons[0]).toHaveTextContent('Week 30')
      expect(snippetButtons[1]).toHaveTextContent('Week 29') 
      expect(snippetButtons[2]).toHaveTextContent('Week 28')
      expect(snippetButtons[3]).toHaveTextContent('Week 27')
    })
  })

  it('should auto-select the most recent snippet (first in the list)', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Week 30 should be auto-selected (has active styling)
      const week30Button = screen.getByText('Week 30').closest('button')
      expect(week30Button).toHaveClass('bg-blue-100')
      expect(week30Button).toHaveClass('border-blue-300')
    })

    // The main content area should show Week 30's content
    await waitFor(() => {
      expect(screen.getByText('Week 30 - Jul 21 - Jul 25, 2025')).toBeInTheDocument()
      expect(screen.getByText('Most recent week content')).toBeInTheDocument()
    })
  })

  it('should handle correct date formatting in reverse chronological order', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Verify that dates are formatted correctly and in the right order
      const dateTexts = screen.getAllByText(/Jul|Jun/).filter(el => 
        el.textContent?.includes(' - ')
      )
      
      // Should see most recent dates first
      expect(screen.getByText('Jul 21 - Jul 25, 2025')).toBeInTheDocument() // Week 30
      expect(screen.getByText('Jul 14 - Jul 18, 2025')).toBeInTheDocument() // Week 29
      expect(screen.getByText('Jul 7 - Jul 11, 2025')).toBeInTheDocument() // Week 28
      expect(screen.getByText('Jun 30 - Jul 4, 2025')).toBeInTheDocument() // Week 27
    })
  })

  it('should maintain reverse chronological order after navigation', async () => {
    // Test with more snippets to ensure pagination doesn't affect ordering
    const manySnippets = Array.from({ length: 10 }, (_, i) => ({
      id: `snippet-${30 - i}`,
      weekNumber: 30 - i,
      startDate: `2025-${String(7 - Math.floor(i / 4)).padStart(2, '0')}-${String(21 - (i % 4) * 7).padStart(2, '0')}`,
      endDate: `2025-${String(7 - Math.floor(i / 4)).padStart(2, '0')}-${String(25 - (i % 4) * 7).padStart(2, '0')}`,
      content: `Week ${30 - i} content`
    }))

    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
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
    
    // First page should show weeks 30, 29, 28, 27
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
      expect(screen.getByText('Week 29')).toBeInTheDocument()
      expect(screen.getByText('Week 28')).toBeInTheDocument()
      expect(screen.getByText('Week 27')).toBeInTheDocument()
    })

    // Navigate to next page - should show weeks 26, 25, 24, 23
    const nextButton = screen.getByRole('button', { name: 'Next page' })
    nextButton.click()

    await waitFor(() => {
      expect(screen.getByText('Week 26')).toBeInTheDocument()
      expect(screen.getByText('Week 25')).toBeInTheDocument()
      expect(screen.getByText('Week 24')).toBeInTheDocument()
      expect(screen.getByText('Week 23')).toBeInTheDocument()
      
      // Older weeks should still be in descending order
      const snippetButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Week ')
      )
      
      expect(snippetButtons[0]).toHaveTextContent('Week 26')
      expect(snippetButtons[1]).toHaveTextContent('Week 25')
      expect(snippetButtons[2]).toHaveTextContent('Week 24')
      expect(snippetButtons[3]).toHaveTextContent('Week 23')
    })
  })

  it('should correctly handle the API response ordering', async () => {
    // Test that the component properly handles API data that's already in desc order
    const apiOrderedSnippets = [
      { id: 'snippet-30', weekNumber: 30, startDate: '2025-07-21', endDate: '2025-07-25', content: 'Week 30' },
      { id: 'snippet-29', weekNumber: 29, startDate: '2025-07-14', endDate: '2025-07-18', content: 'Week 29' },
      { id: 'snippet-28', weekNumber: 28, startDate: '2025-07-07', endDate: '2025-07-11', content: 'Week 28' }
    ]

    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(apiOrderedSnippets)
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
      // Should maintain the order from API (which is already desc)
      const snippetButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Week ')
      )
      
      expect(snippetButtons[0]).toHaveTextContent('Week 30')
      expect(snippetButtons[1]).toHaveTextContent('Week 29')
      expect(snippetButtons[2]).toHaveTextContent('Week 28')
      
      // Most recent (first) should be auto-selected
      expect(snippetButtons[0]).toHaveClass('bg-blue-100')
    })
  })

  it('should handle empty snippets array gracefully', async () => {
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
      // Should show empty state
      expect(screen.getByText('Select a snippet to view or edit')).toBeInTheDocument()
      
      // Should not crash or show any week numbers
      expect(screen.queryByText(/Week \d+/)).not.toBeInTheDocument()
    })
  })
})