/**
 * Weekly Snippets Reminder - Home Page
 * 
 * This is the main page component that provides a CRUD interface for managing
 * weekly work summaries. Users can view, create, edit, and save weekly snippets
 * with a clean, responsive interface.
 * 
 * Features:
 * - Snippet list sidebar with week numbers and date ranges
 * - Main content area for viewing/editing selected snippet
 * - Real-time editing with save/cancel functionality
 * - Responsive design for desktop and mobile
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Settings } from '../components/Settings'
import { PerformanceAssessmentComponent } from '../components/PerformanceAssessment'
import { PerformanceSettings } from '../types/settings'
import { PerformanceAssessment, GenerateDraftRequest, AssessmentContext } from '../types/performance'
import { llmProxy } from '../lib/llmproxy'

/**
 * Interface for weekly snippet data structure
 * Matches the database schema defined in Prisma
 */
interface WeeklySnippet {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  content: string
}


/**
 * Props for the SnippetEditor component
 */
interface SnippetEditorProps {
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
}

/**
 * Main home page component for the Weekly Snippets application
 * Provides the primary user interface for snippet management
 */
const Home = (): JSX.Element => {
  // State management for snippets and UI
  const [snippets, setSnippets] = useState<WeeklySnippet[]>([])
  const [selectedSnippet, setSelectedSnippet] = useState<WeeklySnippet | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'snippets' | 'performance'>('snippets')
  const [assessments, setAssessments] = useState<PerformanceAssessment[]>([])
  const [userSettings, setUserSettings] = useState<PerformanceSettings>({
    jobTitle: '',
    seniorityLevel: '',
    careerLadderFile: null,
    performanceFeedback: '',
    performanceFeedbackFile: null
  })

  /**
   * Initialize component with mock data
   * In production, this would fetch data from the API
   */
  useEffect(() => {
    const mockSnippets: WeeklySnippet[] = [
      {
        id: '1',
        weekNumber: 30,
        startDate: '2024-07-21',
        endDate: '2024-07-25',
        content: 'This week I worked on the user authentication system and completed the API integration for the calendar feature.'
      },
      {
        id: '2',
        weekNumber: 29,
        startDate: '2024-07-14',
        endDate: '2024-07-18',
        content: 'Focused on database schema design and implemented the core CRUD operations for weekly snippets.'
      }
    ]
    setSnippets(mockSnippets)

    // Initialize mock performance assessments
    const mockAssessments: PerformanceAssessment[] = [
      {
        id: '1',
        userId: 'user-1',
        cycleName: 'H1 2025 Performance Review',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        generatedDraft: 'Sample draft content would be here...',
        createdAt: '2025-07-01T00:00:00Z',
        updatedAt: '2025-07-01T00:00:00Z'
      }
    ]
    setAssessments(mockAssessments)
  }, [])

  /**
   * Handle saving snippet content
   * Updates both the snippets array and the selected snippet state
   * 
   * @param content - The updated snippet content
   */
  const handleSaveSnippet = useCallback((content: string): void => {
    if (!selectedSnippet) return

    const updatedSnippets = snippets.map(snippet =>
      snippet.id === selectedSnippet.id
        ? { ...snippet, content }
        : snippet
    )
    
    setSnippets(updatedSnippets)
    setSelectedSnippet({ ...selectedSnippet, content })
    setIsEditing(false)
  }, [selectedSnippet, snippets])

  /**
   * Calculate current week number based on current date
   * Uses ISO week calculation for consistency
   * 
   * @returns Current week number of the year
   */
  const getCurrentWeek = useCallback((): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
  }, [])

  /**
   * Format date range for display (e.g., "Jul 21st - Jul 25th")
   * 
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Formatted date range string
   */
  const formatDateRange = useCallback((startDate: string, endDate: string): string => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    }
    
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
  }, [])

  /**
   * Handle snippet selection from the sidebar
   * 
   * @param snippet - The snippet to select
   */
  const handleSelectSnippet = useCallback((snippet: WeeklySnippet): void => {
    setSelectedSnippet(snippet)
    setIsEditing(false) // Reset edit mode when switching snippets
  }, [])

  /**
   * Toggle edit mode for the selected snippet
   */
  const handleToggleEdit = useCallback((): void => {
    setIsEditing(!isEditing)
  }, [isEditing])

  /**
   * Cancel editing and reset edit mode
   */
  const handleCancelEdit = useCallback((): void => {
    setIsEditing(false)
  }, [])

  /**
   * Handle opening settings modal
   */
  const handleOpenSettings = useCallback((): void => {
    setShowSettings(true)
  }, [])

  /**
   * Handle closing settings modal
   */
  const handleCloseSettings = useCallback((): void => {
    setShowSettings(false)
  }, [])

  /**
   * Handle saving settings
   */
  const handleSaveSettings = useCallback(async (settings: PerformanceSettings): Promise<void> => {
    // In production, this would save to the database
    setUserSettings(settings)
    setShowSettings(false)
    
    // Here you would typically make an API call to save settings
    console.log('Saving settings:', settings)
  }, [])

  /**
   * Handle generating a new performance assessment draft
   */
  const handleGenerateDraft = useCallback(async (request: GenerateDraftRequest): Promise<void> => {
    // Create assessment immediately with generating state
    const newAssessment: PerformanceAssessment = {
      id: Date.now().toString(),
      userId: 'user-1',
      cycleName: request.cycleName,
      startDate: request.startDate,
      endDate: request.endDate,
      generatedDraft: '', // Empty initially
      isGenerating: true, // Mark as generating
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Add to list immediately so user sees it's being generated
    setAssessments(prev => [...prev, newAssessment])

    // Collect context for LLMProxy
    const relevantSnippets = snippets.filter(snippet => {
      const snippetDate = new Date(snippet.startDate)
      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate)
      return snippetDate >= startDate && snippetDate <= endDate
    })

    const context: AssessmentContext = {
      userProfile: {
        jobTitle: userSettings.jobTitle || 'Software Engineer',
        seniorityLevel: userSettings.seniorityLevel || 'Senior',
        careerLadder: userSettings.careerLadderFile ? 'Available' : undefined
      },
      weeklySnippets: relevantSnippets.map(snippet => ({
        weekNumber: snippet.weekNumber,
        startDate: snippet.startDate,
        endDate: snippet.endDate,
        content: snippet.content
      })),
      previousFeedback: userSettings.performanceFeedback || undefined,
      assessmentDirections: request.assessmentDirections,
      cyclePeriod: {
        startDate: request.startDate,
        endDate: request.endDate,
        cycleName: request.cycleName
      }
    }

    // Use LLMProxy to generate the draft in background
    console.log('Generating draft with context:', context)
    
    try {
      const response = await llmProxy.generatePerformanceAssessment(context)
      const generatedDraft = response.content
      console.log('LLMProxy response:', { model: response.model, tokens: response.usage?.tokens })

      // Update the assessment with the generated content
      setAssessments(prev => 
        prev.map(assessment => 
          assessment.id === newAssessment.id 
            ? { 
                ...assessment, 
                generatedDraft, 
                isGenerating: false,
                updatedAt: new Date().toISOString()
              }
            : assessment
        )
      )
    } catch (error) {
      console.error('Failed to generate draft:', error)
      // Update assessment to show error state or remove it
      setAssessments(prev => 
        prev.filter(assessment => assessment.id !== newAssessment.id)
      )
      throw error // Let the component handle the error display
    }
  }, [snippets, userSettings])


  /**
   * Handle deleting a performance assessment
   */
  const handleDeleteAssessment = useCallback(async (assessmentId: string): Promise<void> => {
    setAssessments(prev => prev.filter(a => a.id !== assessmentId))
    console.log('Deleting assessment:', assessmentId)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            UserHub
          </h1>
          <button
            onClick={handleOpenSettings}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center space-x-2"
            aria-label="Open performance cycle settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>
        </header>

        {/* Navigation Tabs */}
        <nav className="mb-8">
          <div className="border-b border-gray-200">
            <div className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('snippets')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'snippets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Weekly Snippets
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Performance Drafts
              </button>
            </div>
          </div>
        </nav>
        
        {/* Tab Content */}
        {activeTab === 'snippets' ? (
          /* Weekly Snippets Content */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Snippets Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Snippets</h2>
              
              {/* Snippets List */}
              <nav className="space-y-3">
                {snippets.map((snippet) => (
                  <button
                    key={snippet.id}
                    onClick={() => handleSelectSnippet(snippet)}
                    className={`w-full text-left p-3 rounded-md cursor-pointer transition-colors ${
                      selectedSnippet?.id === snippet.id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    aria-pressed={selectedSnippet?.id === snippet.id}
                  >
                    <div className="font-medium text-gray-900">
                      Week {snippet.weekNumber}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDateRange(snippet.startDate, snippet.endDate)}
                    </div>
                  </button>
                ))}
                
                {/* Add New Week Button */}
                <button 
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                  aria-label="Add current week snippet"
                >
                  + Add Current Week
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-2">
            {selectedSnippet ? (
              <article className="bg-white rounded-lg shadow-md p-6">
                {/* Snippet Header */}
                <header className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Week {selectedSnippet.weekNumber} - {formatDateRange(selectedSnippet.startDate, selectedSnippet.endDate)}
                  </h2>
                  <button
                    onClick={handleToggleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={isEditing ? 'Cancel editing' : 'Edit snippet'}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </header>

                {/* Content Area */}
                {isEditing ? (
                  <SnippetEditor
                    initialContent={selectedSnippet.content}
                    onSave={handleSaveSnippet}
                    onCancel={handleCancelEdit}
                  />
                ) : (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedSnippet.content}
                    </p>
                  </div>
                )}
              </article>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                <p>Select a snippet to view or edit</p>
              </div>
            )}
          </main>
        </div>
        ) : (
          /* Performance Assessments Content */
          <PerformanceAssessmentComponent
            assessments={assessments}
            onGenerateDraft={handleGenerateDraft}
            onDeleteAssessment={handleDeleteAssessment}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <Settings
            onSave={handleSaveSettings}
            onClose={handleCloseSettings}
            initialSettings={userSettings}
          />
        )}
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default React.memo(Home)

/**
 * Snippet Editor Component
 * 
 * Provides a textarea interface for editing snippet content with
 * save and cancel functionality. Includes proper keyboard navigation
 * and accessibility features.
 * 
 * @param props - Component props
 * @returns JSX element for the snippet editor
 */
function SnippetEditor({ 
  initialContent, 
  onSave, 
  onCancel 
}: SnippetEditorProps): JSX.Element {
  const [content, setContent] = useState<string>(initialContent)

  /**
   * Handle content changes in the textarea
   * 
   * @param event - Change event from textarea
   */
  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(event.target.value)
  }, [])

  /**
   * Handle save action
   */
  const handleSave = useCallback((): void => {
    onSave(content)
  }, [content, onSave])

  return (
    <div className="space-y-4">
      {/* Content Editor */}
      <textarea
        value={content}
        onChange={handleContentChange}
        className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Describe what you accomplished this week and your plans for next week..."
        aria-label="Snippet content editor"
      />
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Save snippet changes"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Cancel editing"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}