/**
 * Unit tests for SnippetEditor markdown preview functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../page'

// Mock the fetch function
global.fetch = jest.fn()

describe('Snippet Editor Markdown Support', () => {
  const mockSnippets = [
    {
      id: 'snippet-30',
      weekNumber: 30,
      startDate: '2025-07-21',
      endDate: '2025-07-25',
      content: `## Done
- **Implemented** user authentication system
- *Optimized* database queries by 40%

## Next  
- [ ] Start working on new dashboard
- [ ] Review code with team`
    }
  ]

  const mockAssessments: any[] = []

  beforeEach(() => {
    jest.resetAllMocks()
    
    // Mock successful API responses
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

  it('should show Edit and Preview tabs in editor mode', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Click Edit button to enter editing mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      // Should see the tab buttons
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
      
      // Edit tab should be active by default
      const editTab = screen.getByRole('button', { name: 'Edit' })
      expect(editTab).toHaveClass('border-blue-500', 'text-blue-600')
    })
  })

  it('should switch between Edit and Preview tabs', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      // Should see textarea in edit mode
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    // Click Preview tab
    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    await waitFor(() => {
      // Should see preview instead of textarea
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      
      // Should see rendered markdown content
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByText('Implemented')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  it('should render markdown in preview mode correctly', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    // Switch to preview mode
    await waitFor(() => {
      const previewTab = screen.getByRole('button', { name: 'Preview' })
      fireEvent.click(previewTab)
    })

    await waitFor(() => {
      // Check that markdown is properly rendered
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Implemented')).toBeInTheDocument()
      expect(screen.getByText('Optimized')).toBeInTheDocument()
      
      // Check for task list checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
      expect(checkboxes[0]).not.toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })
  })

  it('should show helpful placeholder text in edit mode', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('placeholder')
      
      const placeholder = textarea.getAttribute('placeholder')
      expect(placeholder).toContain('Markdown formatting')
      expect(placeholder).toContain('**bold text**')
      expect(placeholder).toContain('## Headings')
      expect(placeholder).toContain('- [ ] Start working')
    })
  })

  it('should show contextual help text below editor', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      // Should show help text for edit mode
      expect(screen.getByText('Supports Markdown formatting')).toBeInTheDocument()
    })

    // Switch to preview mode
    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    await waitFor(() => {
      // Should show different help text for preview mode
      expect(screen.getByText('Preview of your formatted content')).toBeInTheDocument()
    })
  })

  it('should handle empty content in preview mode gracefully', async () => {
    const emptySnippet = [{
      id: 'snippet-30',
      weekNumber: 30,
      startDate: '2025-07-21',
      endDate: '2025-07-25',
      content: ''
    }]

    ;(fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/snippets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptySnippet)
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
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    // Switch to preview mode
    await waitFor(() => {
      const previewTab = screen.getByRole('button', { name: 'Preview' })
      fireEvent.click(previewTab)
    })

    await waitFor(() => {
      // Should show empty state message
      expect(screen.getByText('Nothing to preview yet. Switch to Edit mode to add content.')).toBeInTheDocument()
    })
  })

  it('should allow editing and show live preview updates', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      const textarea = screen.getByRole('textbox')
      
      // Clear existing content and add new markdown
      fireEvent.change(textarea, { 
        target: { value: '## New Section\n- **Bold item**\n- [ ] Task item' }
      })
    })

    // Switch to preview mode
    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    await waitFor(() => {
      // Should see the new content rendered
      expect(screen.getByText('New Section')).toBeInTheDocument()
      expect(screen.getByText('Bold item')).toBeInTheDocument()
      expect(screen.getByText('Task item')).toBeInTheDocument()
      
      // Should have checkbox for task item
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should maintain tab state when switching between edit and preview', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      const editTab = screen.getByRole('button', { name: 'Edit' })
      const previewTab = screen.getByRole('button', { name: 'Preview' })
      
      // Edit should be active initially
      expect(editTab).toHaveClass('border-blue-500', 'text-blue-600')
      expect(previewTab).toHaveClass('border-transparent', 'text-gray-500')
      
      // Click preview
      fireEvent.click(previewTab)
    })

    await waitFor(() => {
      const editTab = screen.getByRole('button', { name: 'Edit' })
      const previewTab = screen.getByRole('button', { name: 'Preview' })
      
      // Preview should now be active
      expect(previewTab).toHaveClass('border-blue-500', 'text-blue-600')
      expect(editTab).toHaveClass('border-transparent', 'text-gray-500')
    })
  })

  it('should preserve content when saving from preview mode', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Week 30')).toBeInTheDocument()
    })

    // Enter edit mode
    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    await waitFor(() => {
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { 
        target: { value: '## Updated Content\n- **New item**' }
      })
    })

    // Switch to preview and save
    const previewTab = screen.getByRole('button', { name: 'Preview' })
    fireEvent.click(previewTab)

    await waitFor(() => {
      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      // Should have called the API with the updated content
      expect(fetch).toHaveBeenCalledWith('/api/snippets', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          id: 'snippet-30',
          content: '## Updated Content\n- **New item**'
        })
      }))
    })
  })
})