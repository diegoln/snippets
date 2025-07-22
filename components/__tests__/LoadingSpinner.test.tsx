/**
 * Unit tests for LoadingSpinner component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin', 'w-5', 'h-5', 'text-white')
  })

  it('should render with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('w-4', 'h-4')
  })

  it('should render with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('w-6', 'h-6')
  })

  it('should render with blue color', () => {
    const { container } = render(<LoadingSpinner color="blue" />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('text-blue-600')
  })

  it('should render with gray color', () => {
    const { container } = render(<LoadingSpinner color="gray" />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('text-gray-400')
  })

  it('should apply custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('custom-class')
  })

  it('should have proper accessibility attributes', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveAttribute('aria-hidden', 'true')
  })

  it('should have animation class', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.querySelector('svg')
    expect(spinner).toHaveClass('animate-spin')
  })
})