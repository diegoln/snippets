/**
 * Unit tests for Logo component
 * Tests brand compliance, variant rendering, and accessibility
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Logo, LogoWithClearSpace } from '../Logo'

// Mock Next.js Image component
jest.mock('next/image', () => {
  const MockImage = ({ src, alt, width, height, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      {...props}
      data-testid="logo-image"
    />
  )
  MockImage.displayName = 'Image'
  return MockImage
})

describe('Logo Component', () => {
  describe('Default Behavior', () => {
    it('should render horizontal logo by default', () => {
      render(<Logo />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/01_logo_horizontal.png')
      expect(image).toHaveAttribute('alt', 'AdvanceWeekly')
      expect(image).toHaveAttribute('width', '130')
      expect(image).toHaveAttribute('height', '40')
    })

    it('should have minimum width requirement', () => {
      const { container } = render(<Logo />)
      
      const logoContainer = container.querySelector('.logo-container')
      expect(logoContainer).toHaveStyle('min-width: 80px')
    })
  })

  describe('Variant Selection', () => {
    it('should render horizontal variant', () => {
      render(<Logo variant="horizontal" />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/01_logo_horizontal.png')
    })

    it('should render horizontal variant with tagline', () => {
      render(<Logo variant="horizontal" showTagline />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/02_logo_horizontal_tagline.png')
      expect(image).toHaveAttribute('alt', 'AdvanceWeekly - See beyond the busy.')
    })

    it('should render stacked variant', () => {
      render(<Logo variant="stacked" />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/03_logo_stacked.png')
    })

    it('should render stacked variant with tagline', () => {
      render(<Logo variant="stacked" showTagline />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/04_logo_stacked_tagline.png')
      expect(image).toHaveAttribute('alt', 'AdvanceWeekly - See beyond the busy.')
    })

    it('should render icon variant', () => {
      render(<Logo variant="icon" />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/06_icon_circle.png')
      expect(image).toHaveAttribute('width', '32')
      expect(image).toHaveAttribute('height', '32')
    })
  })

  describe('Dark Mode Support', () => {
    it('should use white logo on dark backgrounds', () => {
      render(<Logo dark />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/07_logo_horizontal_white.png')
    })

    it('should use white logo with custom variant', () => {
      render(<Logo variant="horizontal" dark />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/07_logo_horizontal_white.png')
    })
  })

  describe('Custom Dimensions', () => {
    it('should accept custom width and height', () => {
      render(<Logo width={200} height={60} />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('width', '200')
      expect(image).toHaveAttribute('height', '60')
    })

    it('should calculate height from width for horizontal variant', () => {
      render(<Logo variant="horizontal" width={260} />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('width', '260')
      // Height should be calculated based on aspect ratio
      expect(image).toHaveAttribute('height', '80')
    })

    it('should respect minimum size guidelines', () => {
      const { container } = render(<Logo width={50} />)
      
      const logoContainer = container.querySelector('.logo-container')
      expect(logoContainer).toHaveStyle('min-width: 80px')
    })
  })

  describe('Accessibility', () => {
    it('should have proper alt text without tagline', () => {
      render(<Logo />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('alt', 'AdvanceWeekly')
    })

    it('should have proper alt text with tagline', () => {
      render(<Logo showTagline />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('alt', 'AdvanceWeekly - See beyond the busy.')
    })

    it('should support custom className', () => {
      const { container } = render(<Logo className="custom-logo" />)
      
      const logoContainer = container.querySelector('.logo-container')
      expect(logoContainer).toHaveClass('custom-logo')
    })
  })

  describe('Performance Optimization', () => {
    it('should support priority loading', () => {
      render(<Logo priority />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('fetchPriority', 'high')
    })

    it('should have proper image styling', () => {
      render(<Logo />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveStyle({
        maxWidth: '100%',
        height: 'auto'
      })
    })
  })

  describe('Brand Compliance', () => {
    it('should enforce minimum width of 80px', () => {
      const { container } = render(<Logo width={50} />)
      
      const logoContainer = container.querySelector('.logo-container')
      expect(logoContainer).toHaveStyle('min-width: 80px')
    })

    it('should use icon variant for very small sizes', () => {
      render(<Logo variant="icon" width={24} />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('src', '/brand/06_icon_circle.png')
      expect(image).toHaveAttribute('width', '24')
    })

    it('should maintain aspect ratio', () => {
      render(<Logo variant="horizontal" width={160} />)
      
      const image = screen.getByTestId('logo-image')
      expect(image).toHaveAttribute('width', '160')
      // Aspect ratio for horizontal logo should be maintained
      expect(parseFloat(image.getAttribute('height')!)).toBeCloseTo(49.23, 0)
    })
  })
})

describe('LogoWithClearSpace Component', () => {
  it('should add clear space around logo', () => {
    const { container } = render(<LogoWithClearSpace />)
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle('padding: 16px')
  })

  it('should add smaller clear space for icon variant', () => {
    const { container } = render(<LogoWithClearSpace variant="icon" />)
    
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle('padding: 8px')
  })

  it('should pass through all logo props', () => {
    render(<LogoWithClearSpace variant="stacked" showTagline width={120} />)
    
    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/brand/04_logo_stacked_tagline.png')
    expect(image).toHaveAttribute('width', '120')
  })
})

describe('Edge Cases', () => {
  it('should handle invalid variant gracefully', () => {
    render(<Logo variant={'invalid' as any} />)
    
    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/brand/01_logo_horizontal.png')
  })

  it('should handle missing props gracefully', () => {
    render(<Logo variant={undefined} />)
    
    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('src', '/brand/01_logo_horizontal.png')
  })
})