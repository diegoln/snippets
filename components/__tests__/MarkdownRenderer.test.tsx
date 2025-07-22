/**
 * Unit tests for MarkdownRenderer component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MarkdownRenderer } from '../MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('should render plain text correctly', () => {
    const content = 'This is plain text'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('This is plain text')).toBeInTheDocument()
  })

  it('should render headings correctly', () => {
    const content = '# Main Title\n## Subtitle\n### Section'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('Main Title')).toBeInTheDocument()
    expect(screen.getByText('Subtitle')).toBeInTheDocument()
    expect(screen.getByText('Section')).toBeInTheDocument()
  })

  it('should render bold text correctly', () => {
    const content = '**Bold text** and __also bold__'
    render(<MarkdownRenderer content={content} />)
    
    const boldElements = screen.getAllByText(/Bold text|also bold/)
    expect(boldElements).toHaveLength(2)
  })

  it('should render italic text correctly', () => {
    const content = '*Italic text* and _also italic_'
    render(<MarkdownRenderer content={content} />)
    
    const italicElements = screen.getAllByText(/Italic text|also italic/)
    expect(italicElements).toHaveLength(2)
  })

  it('should render unordered lists correctly', () => {
    const content = '- Item 1\n- Item 2\n- Item 3'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
    
    // Check that it's rendered as a list
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(3)
  })

  it('should render ordered lists correctly', () => {
    const content = '1. First item\n2. Second item\n3. Third item'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('First item')).toBeInTheDocument()
    expect(screen.getByText('Second item')).toBeInTheDocument()
    expect(screen.getByText('Third item')).toBeInTheDocument()
  })

  it('should render inline code correctly', () => {
    const content = 'Use the `console.log()` function'
    render(<MarkdownRenderer content={content} />)
    
    const codeElement = screen.getByText('console.log()')
    expect(codeElement).toBeInTheDocument()
    expect(codeElement).toHaveClass('bg-gray-100')
  })

  it('should render code blocks correctly', () => {
    const content = '```javascript\nconst x = 10;\nconsole.log(x);\n```'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText(/const x = 10/)).toBeInTheDocument()
  })

  it('should render links correctly', () => {
    const content = '[Click here](https://example.com)'
    render(<MarkdownRenderer content={content} />)
    
    const linkElement = screen.getByRole('link', { name: 'Click here' })
    expect(linkElement).toBeInTheDocument()
    expect(linkElement).toHaveAttribute('href', 'https://example.com')
    expect(linkElement).toHaveAttribute('target', '_blank')
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should render blockquotes correctly', () => {
    const content = '> This is a blockquote'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('This is a blockquote')).toBeInTheDocument()
  })

  it('should render task lists (GitHub Flavored Markdown)', () => {
    const content = '- [x] Completed task\n- [ ] Incomplete task'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('Completed task')).toBeInTheDocument()
    expect(screen.getByText('Incomplete task')).toBeInTheDocument()
    
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
  })

  it('should handle empty content gracefully', () => {
    render(<MarkdownRenderer content="" />)
    
    // Should not crash and should render empty div
    const container = document.querySelector('.prose')
    expect(container).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const content = 'Test content'
    render(<MarkdownRenderer content={content} className="custom-class" />)
    
    const container = document.querySelector('.prose')
    expect(container).toHaveClass('custom-class')
  })

  it('should render horizontal rule', () => {
    const content = 'Before\n\n---\n\nAfter'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })

  it('should handle complex nested content', () => {
    const content = `## Done
- **Implemented** user authentication system
- *Optimized* database queries by 40%
- Fixed critical bug in \`payment processing\`

## Next
- [ ] Start working on new dashboard
- [ ] Review code with team
- Research [GraphQL](https://graphql.org) implementation

> Remember to update documentation`

    render(<MarkdownRenderer content={content} />)
    
    // Check headings
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    
    // Check mixed formatting
    expect(screen.getByText('Implemented')).toBeInTheDocument()
    expect(screen.getByText('Optimized')).toBeInTheDocument()
    expect(screen.getByText('payment processing')).toBeInTheDocument()
    
    // Check task list
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    
    // Check link
    const link = screen.getByRole('link', { name: 'GraphQL' })
    expect(link).toHaveAttribute('href', 'https://graphql.org')
    
    // Check blockquote
    expect(screen.getByText('Remember to update documentation')).toBeInTheDocument()
  })

  it('should render typical snippet format correctly', () => {
    const content = `## Done
- **Completed user authentication system** with OAuth integration and role-based access control
- **Optimized database queries** reducing response time by 40% across core API endpoints
- **Implemented comprehensive unit tests** for the payment processing module achieving 95% coverage

## Next
- [ ] Begin implementation of the new dashboard analytics feature for Q1 release
- [ ] Continue working on API documentation and developer portal improvements
- [ ] Start security penetration testing for the payment processing system`

    render(<MarkdownRenderer content={content} />)
    
    // Should render all the content with proper formatting
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Completed user authentication system')).toBeInTheDocument()
    expect(screen.getByText('Optimized database queries')).toBeInTheDocument()
    
    // Check task list items
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
    expect(checkboxes[2]).not.toBeChecked()
  })
})