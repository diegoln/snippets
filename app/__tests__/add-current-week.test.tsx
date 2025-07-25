/**
 * Tests for Add Current Week button functionality
 * 
 * This test suite verifies that the "Add Current Week" button:
 * - Properly calculates the current week number
 * - Creates a new snippet when none exists for current week
 * - Selects existing snippet when one already exists for current week
 * - Handles API errors gracefully
 * - Uses proper design system styling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleLog = console.log

beforeAll(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.log = originalConsoleLog
})

describe('Add Current Week Button', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    ;(fetch as jest.MockedFunction<typeof fetch>).mockReset()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render the Add Current Week button with proper styling', async () => {
    // Mock empty snippets response
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock empty assessments response
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    render(<Home />)

    await waitFor(() => {
      const addButton = screen.getByRole('button', { name: /add current week snippet/i })
      expect(addButton).toBeInTheDocument()
      expect(addButton).toHaveTextContent('+ Add Current Week')
      
      // Check for design system classes
      expect(addButton).toHaveClass('border-dashed')
      expect(addButton).toHaveClass('border-neutral-600/30')
      expect(addButton).toHaveClass('text-secondary')
      expect(addButton).toHaveClass('rounded-card')
      expect(addButton).toHaveClass('transition-advance')
    })
  })

  it('should create a new snippet when clicking Add Current Week', async () => {
    // Mock initial empty snippets
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock successful snippet creation
    const mockNewSnippet = {
      id: 'new-snippet-id',
      weekNumber: 30,
      startDate: '2024-07-21',
      endDate: '2024-07-25',
      content: '## Done\\n\\n- \\n\\n## Next\\n\\n- \\n\\n## Notes\\n\\n'
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewSnippet
    } as Response)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Verify POST request was made
      expect(fetch).toHaveBeenCalledWith('/api/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekNumber: 30, // Current week calculation may vary
          content: '## Done\\n\\n- \\n\\n## Next\\n\\n- \\n\\n## Notes\\n\\n'
        })
      })
    })
  })

  it('should work with mock database in local development', async () => {
    // Mock initial snippets from mock database
    const mockSnippets = [
      {
        id: 'snippet-1',
        weekNumber: 28,
        startDate: '2024-07-07',
        endDate: '2024-07-11',
        content: '## Done\n\n- Test content',
        createdAt: '2024-07-07T00:00:00.000Z',
        updatedAt: '2024-07-07T00:00:00.000Z'
      }
    ]

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnippets
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock successful snippet creation
    const mockNewSnippet = {
      id: 'snippet-mock-123',
      weekNumber: 31,
      startDate: '2024-07-28',
      endDate: '2024-08-01',
      content: '## Done\\n\\n- \\n\\n## Next\\n\\n- \\n\\n## Notes\\n\\n'
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewSnippet
    } as Response)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
      expect(screen.getByText('Week 28')).toBeInTheDocument() // Shows existing snippet
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Should have created new snippet and show it in edit mode
      expect(fetch).toHaveBeenCalledWith('/api/snippets', expect.objectContaining({
        method: 'POST'
      }))
    })
  })

  it('should select existing snippet when current week already exists', async () => {
    const currentWeek = 30
    const existingSnippet = {
      id: 'existing-snippet',
      weekNumber: currentWeek,
      startDate: '2024-07-21',
      endDate: '2024-07-25',
      content: 'Existing content'
    }

    // Mock snippets response with existing current week snippet
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => [existingSnippet]
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Should not make POST request since snippet exists
      expect(fetch).not.toHaveBeenCalledWith('/api/snippets', expect.objectContaining({
        method: 'POST'
      }))
      
      // Should select the existing snippet
      expect(screen.getByText(`Week ${currentWeek}`)).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    // Mock initial empty snippets
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock failed snippet creation
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    } as Response)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to create new snippet. Please try again.')
    })

    alertSpy.mockRestore()
  })

  it('should handle network errors gracefully', async () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

    // Mock initial empty snippets
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock network error
    ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to create new snippet. Please try again.')
    })

    alertSpy.mockRestore()
  })

  it('should start in edit mode after creating new snippet', async () => {
    // Mock initial empty snippets
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock successful snippet creation
    const mockNewSnippet = {
      id: 'new-snippet-id',
      weekNumber: 30,
      startDate: '2024-07-21',
      endDate: '2024-07-25',
      content: '## Done\\n\\n- \\n\\n## Next\\n\\n- \\n\\n## Notes\\n\\n'
    }

    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNewSnippet
    } as Response)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Should show edit mode (Cancel button should be visible)
      expect(screen.getByRole('button', { name: /cancel editing/i })).toBeInTheDocument()
    })
  })

  it('should use correct template for new snippet content', async () => {
    // Mock initial empty snippets
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock empty assessments
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    // Mock successful snippet creation
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'new-snippet-id',
        weekNumber: 30,
        startDate: '2024-07-21',
        endDate: '2024-07-25',
        content: '## Done\\n\\n- \\n\\n## Next\\n\\n- \\n\\n## Notes\\n\\n'
      })
    } as Response)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add current week snippet/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add current week snippet/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Verify the template content was used
      const postCall = (fetch as jest.MockedFunction<typeof fetch>).mock.calls.find(call => 
        call[0] === '/api/snippets' && call[1]?.method === 'POST'
      )
      expect(postCall).toBeDefined()
      
      if (postCall && postCall[1] && postCall[1].body) {
        const body = JSON.parse(postCall[1].body as string)
        expect(body.content).toBe('## Done\\n\\n- \\n\\n## Next\\n\\n- \\n\\n## Notes\\n\\n')
      }
    })
  })
})