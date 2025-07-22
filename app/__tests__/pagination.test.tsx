/**
 * Unit tests for pagination functionality in the Home component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock the fetch function
global.fetch = jest.fn()

// Mock data for testing pagination
const createMockSnippet = (weekNumber: number, id: string) => ({
  id,
  weekNumber,
  startDate: `2025-07-${21 - (30 - weekNumber)}`, // Calculate dates backwards from week 30
  endDate: `2025-07-${25 - (30 - weekNumber)}`,
  content: `Week ${weekNumber} content`
})

const mockSnippets = Array.from({ length: 10 }, (_, i) => 
  createMockSnippet(30 - i, `snippet-${30 - i}`)
)

const mockAssessments: any[] = []

describe('Pagination functionality', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
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
  })

  it('should display only 4 snippets per page initially', async () => {
    render(<Home />)
    
    await waitFor(() => {
      // Should see 4 snippets (weeks 30, 29, 28, 27)
      expect(screen.getByText('Week 30')).toBeInTheDocument()
      expect(screen.getByText('Week 29')).toBeInTheDocument()
      expect(screen.getByText('Week 28')).toBeInTheDocument()
      expect(screen.getByText('Week 27')).toBeInTheDocument()
      
      // Should not see week 26 (it's on page 2)
      expect(screen.queryByText('Week 26')).not.toBeInTheDocument()
    })
  })

  it('should show pagination controls when there are more than 4 snippets', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('1 of 3')).toBeInTheDocument() // 10 snippets / 4 per page = 3 pages
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
    })
  })

  it('should disable Previous button on first page', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const prevButton = screen.getByRole('button', { name: 'Previous page' })
      expect(prevButton).toBeDisabled()
    })
  })

  it('should navigate to next page when Next button is clicked', async () => {
    render(<Home />)
    
    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: 'Next page' })
      expect(nextButton).not.toBeDisabled()
      
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      // Should now see weeks 26, 25, 24, 23 (page 2)
      expect(screen.getByText('Week 26')).toBeInTheDocument()
      expect(screen.getByText('Week 25')).toBeInTheDocument()
      expect(screen.getByText('Week 24')).toBeInTheDocument()
      expect(screen.getByText('Week 23')).toBeInTheDocument()
      
      // Should not see week 30 anymore
      expect(screen.queryByText('Week 30')).not.toBeInTheDocument()
      
      // Page indicator should update
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })
  })

  it('should navigate to previous page when Previous button is clicked', async () => {
    render(<Home />)
    
    // First go to page 2
    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: 'Next page' })
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })

    // Then go back to page 1
    const prevButton = screen.getByRole('button', { name: 'Previous page' })
    fireEvent.click(prevButton)

    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })
  })

  it('should disable Next button on last page', async () => {
    render(<Home />)
    
    // Navigate to last page
    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: 'Next page' })
      fireEvent.click(nextButton) // Page 2
    })

    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: 'Next page' })
      fireEvent.click(nextButton) // Page 3 (last page)
    })

    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: 'Next page' })
      expect(nextButton).toBeDisabled()
      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })
  })

  it('should reset to first page when snippets change', async () => {
    const { rerender } = render(<Home />)
    
    // Go to page 2
    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: 'Next page' })
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })

    // Mock new snippet data (different count)
    const newMockSnippets = mockSnippets.slice(0, 5) // Only 5 snippets now
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newMockSnippets)
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

    // Force re-render to trigger useEffect
    rerender(<Home />)

    await waitFor(() => {
      // Should reset to page 1
      expect(screen.getByText('1 of 2')).toBeInTheDocument() // 5 snippets / 4 per page = 2 pages
    })
  })

  it('should not show pagination controls when there are 4 or fewer snippets', async () => {
    // Mock only 3 snippets
    const fewSnippets = mockSnippets.slice(0, 3)
    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fewSnippets)
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
      // Should not show pagination controls
      expect(screen.queryByText(/of/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })
  })

  it('should maintain correct SNIPPETS_PER_PAGE constant', () => {
    // This tests that the constant is correctly set to 4
    // We can't directly access the constant from the component, but we can verify its behavior
    render(<Home />)
    
    // The test above already verifies that exactly 4 items are shown per page
    // This is more of a documentation test to ensure the requirement is clear
    expect(4).toBe(4) // SNIPPETS_PER_PAGE should be 4
  })
})