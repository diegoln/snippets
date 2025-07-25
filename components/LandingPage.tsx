'use client'

/**
 * Landing Page Component - Product Introduction and Authentication Entry Point
 * 
 * This component serves as the main landing page for unauthenticated users.
 * It provides:
 * - Beautiful product explanation and value proposition
 * - Google OAuth authentication button (environment-aware)
 * - Feature showcase with icons and descriptions
 * - How-it-works section with step-by-step process
 * - Call-to-action sections to encourage sign-up
 * 
 * The component adapts to different environments:
 * - Development: Shows "(Dev)" suffix on buttons and uses mock auth
 * - Production: Uses real Google OAuth integration
 */

import { signIn } from 'next-auth/react'
import { Logo } from './Logo'

/**
 * Landing page component that showcases the product and handles initial authentication
 * 
 * @returns JSX element for the landing page
 */
export function LandingPage() {
  /**
   * Handle Google OAuth sign-in
   * In development, this redirects to mock sign-in page
   * In production, this triggers real Google OAuth flow
   */
  const handleGoogleSignIn = () => {
    if (process.env.NODE_ENV === 'development') {
      // In development, redirect to mock signin page for testing
      // This allows developers to test the full flow without Google OAuth setup
      window.location.href = '/mock-signin'
    } else {
      // In production, use real Google OAuth with NextAuth
      // NextAuth callbacks will handle redirecting to onboarding
      signIn('google')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <Logo variant="horizontal" width={240} priority />
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold text-primary-600 mb-6">
            See beyond the busy.
          </h1>
          
          <p className="text-xl lg:text-2xl text-secondary max-w-3xl mx-auto leading-relaxed mb-12">
            Transform your weekly work into meaningful insights with AI-powered performance assessments. 
            Track your progress, showcase your impact, and advance your career with confidence.
          </p>
          
          <button
            onClick={handleGoogleSignIn}
            className="btn-primary px-8 py-4 rounded-pill text-lg font-semibold shadow-elevation-1 hover:shadow-lg transition-all duration-300 flex items-center space-x-3 mx-auto"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google{process.env.NODE_ENV === 'development' ? ' (Dev)' : ''}</span>
          </button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary-600 mb-4">
              Weekly Snippets
            </h3>
            <p className="text-secondary leading-relaxed">
              Capture your weekly accomplishments in a structured format. Never forget what you've achieved or lose track of your progress.
            </p>
          </div>

          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary-600 mb-4">
              AI-Powered Insights
            </h3>
            <p className="text-secondary leading-relaxed">
              Transform your weekly notes into compelling performance reviews and career advancement documents with AI assistance.
            </p>
          </div>

          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-accent-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary-600 mb-4">
              Career Growth
            </h3>
            <p className="text-secondary leading-relaxed">
              Build a comprehensive record of your professional journey. Use data-driven insights to navigate promotions and career changes.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-primary-600 mb-12">
            How AdvanceWeekly Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="relative">
              <div className="bg-accent-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-primary-600 mb-3">
                Capture Weekly
              </h3>
              <p className="text-secondary">
                Document your accomplishments, challenges, and goals each week in our structured format.
              </p>
            </div>
            
            <div className="relative">
              <div className="bg-accent-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-primary-600 mb-3">
                AI Enhancement
              </h3>
              <p className="text-secondary">
                Our AI analyzes your work patterns and generates professional performance assessments.
              </p>
            </div>
            
            <div className="relative">
              <div className="bg-accent-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-primary-600 mb-3">
                Advance Career
              </h3>
              <p className="text-secondary">
                Use your documented achievements for reviews, promotions, and career opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="card p-12 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-primary-600 mb-4">
              Ready to Transform Your Career?
            </h2>
            <p className="text-secondary mb-8">
              Join thousands of professionals who are using AdvanceWeekly to track their progress and accelerate their career growth.
            </p>
            <button
              onClick={handleGoogleSignIn}
              className="btn-accent px-8 py-4 rounded-pill text-lg font-semibold shadow-elevation-1 hover:shadow-lg transition-all duration-300 flex items-center space-x-3 mx-auto"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Get Started Free{process.env.NODE_ENV === 'development' ? ' (Dev)' : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}