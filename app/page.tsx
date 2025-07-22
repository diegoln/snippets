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

import React, { useState, useEffect, useCallback, useReducer, useMemo } from 'react'
import { Settings } from '../components/Settings'
import { PerformanceAssessmentComponent } from '../components/PerformanceAssessment'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { Logo } from '../components/Logo'
import { PerformanceSettings } from '../types/settings'
import { PerformanceAssessment, AssessmentFormData, AssessmentContext, AssessmentAction, ASSESSMENT_CONSTANTS } from '../types/performance'
import { llmProxy } from '../lib/llmproxy'
import { formatDateRangeWithYear } from '../lib/date-utils'

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
 * Reducer for managing assessment state with proper immutability
 */
const assessmentReducer = (state: PerformanceAssessment[], action: AssessmentAction): PerformanceAssessment[] => {
  switch (action.type) {
    case 'ADD_ASSESSMENT':
      return [action.payload, ...state]
    
    case 'UPDATE_ASSESSMENT':
      return state.map(assessment => 
        assessment.id === action.id 
          ? { ...assessment, ...action.updates }
          : assessment
      )
    
    case 'REMOVE_ASSESSMENT':
      return state.filter(assessment => assessment.id !== action.id)
    
    case 'SET_ASSESSMENTS':
      return action.payload
    
    default:
      return state
  }
}

/**
 * Input sanitization utility
 */
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .substring(0, ASSESSMENT_CONSTANTS.MAX_CYCLE_NAME_LENGTH)
}


/**
 * Props for the SnippetEditor component
 */
interface SnippetEditorProps {
  initialContent: string
  onSave: (content: string) => Promise<void>
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
  const [assessments, dispatch] = useReducer(assessmentReducer, [])
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [userSettings, setUserSettings] = useState<PerformanceSettings>({
    jobTitle: '',
    seniorityLevel: '',
    careerLadderFile: null,
    performanceFeedback: '',
    performanceFeedbackFile: null
  })

  // Memoized sorted assessments for performance
  const sortedAssessments = useMemo(() => 
    [...assessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assessments]
  )

  // Pagination logic for snippets
  const SNIPPETS_PER_PAGE = 4
  const totalPages = Math.ceil(snippets.length / SNIPPETS_PER_PAGE)
  const startIndex = currentPage * SNIPPETS_PER_PAGE
  const endIndex = startIndex + SNIPPETS_PER_PAGE
  const paginatedSnippets = snippets.slice(startIndex, endIndex)
  
  // Reset to first page when snippets change
  useEffect(() => {
    setCurrentPage(0)
  }, [snippets.length])

  /**
   * Load snippets from the database on component mount
   */
  useEffect(() => {
    const fetchSnippets = async () => {
      try {
        const response = await fetch('/api/snippets')
        if (response.ok) {
          const snippetsData = await response.json()
          setSnippets(snippetsData)
          
          // Auto-select the most recent snippet if available (first item since API returns desc order)
          if (snippetsData.length > 0) {
            setSelectedSnippet(snippetsData[0])
          }
        } else {
          console.error('Failed to fetch snippets:', response.statusText)
          // Fallback to empty state instead of mock data
          setSnippets([])
        }
      } catch (error) {
        console.error('Error fetching snippets:', error)
        setSnippets([])
      }
    }

    fetchSnippets()

    // Load assessments from the database
    const fetchAssessments = async () => {
      try {
        const response = await fetch('/api/assessments')
        if (response.ok) {
          const assessmentsData = await response.json()
          dispatch({ type: 'SET_ASSESSMENTS', payload: assessmentsData })
        } else {
          console.error('Failed to fetch assessments:', response.statusText)
          dispatch({ type: 'SET_ASSESSMENTS', payload: [] })
        }
      } catch (error) {
        console.error('Error fetching assessments:', error)
        dispatch({ type: 'SET_ASSESSMENTS', payload: [] })
      }
    }

    fetchAssessments()
  }, [])

  /**
   * Handle saving snippet content
   * Updates both the snippets array and the selected snippet state
   * 
   * @param content - The updated snippet content
   */
  const handleSaveSnippet = useCallback(async (content: string): Promise<void> => {
    if (!selectedSnippet) return

    try {
      const response = await fetch('/api/snippets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedSnippet.id,
          content
        })
      })

      if (response.ok) {
        const updatedSnippet = await response.json()
        
        const updatedSnippets = snippets.map(snippet =>
          snippet.id === selectedSnippet.id
            ? { ...snippet, content }
            : snippet
        )
        
        setSnippets(updatedSnippets)
        setSelectedSnippet({ ...selectedSnippet, content })
        setIsEditing(false)
      } else {
        console.error('Failed to save snippet:', response.statusText)
        // Could show an error toast here
      }
    } catch (error) {
      console.error('Error saving snippet:', error)
      // Could show an error toast here
    }
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
   * Format date range for display (e.g., "Jul 21 - Jul 25, 2024")
   * 
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Formatted date range string
   */
  const formatDateRange = useCallback((startDate: string, endDate: string): string => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return formatDateRangeWithYear(start, end)
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
   * Handle pagination controls
   */
  const handlePreviousPage = useCallback((): void => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }, [])

  const handleNextPage = useCallback((): void => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
  }, [totalPages])

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
  const handleGenerateDraft = useCallback(async (request: AssessmentFormData): Promise<void> => {
    // Input validation and sanitization
    const sanitizedRequest = {
      cycleName: sanitizeInput(request.cycleName),
      startDate: request.startDate,
      endDate: request.endDate,
      assessmentDirections: request.assessmentDirections ? 
        sanitizeInput(request.assessmentDirections) : undefined
    }

    try {
      console.log(`🔄 Generating assessment for ${sanitizedRequest.cycleName}...`)
      
      // Call the API to generate the assessment
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedRequest)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate assessment')
      }

      const generatedAssessment = await response.json()
      
      // Add the completed assessment to the list
      const newAssessment: PerformanceAssessment = {
        id: generatedAssessment.id,
        userId: 'user-1',
        cycleName: generatedAssessment.cycleName,
        startDate: generatedAssessment.startDate,
        endDate: generatedAssessment.endDate,
        generatedDraft: generatedAssessment.generatedDraft,
        isGenerating: false,
        createdAt: generatedAssessment.createdAt,
        updatedAt: generatedAssessment.updatedAt
      }
      
      dispatch({ type: 'ADD_ASSESSMENT', payload: newAssessment })

      console.log(`✅ Assessment generated successfully!`, generatedAssessment.stats)
    } catch (error) {
      console.error('Failed to generate assessment:', error)
      
      // You might want to show an error message to the user here
      // For now, we'll just log it
      alert(`Failed to generate assessment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [dispatch])


  /**
   * Handle deleting a performance assessment
   */
  const handleDeleteAssessment = useCallback(async (assessmentId: string): Promise<void> => {
    try {
      dispatch({ type: 'REMOVE_ASSESSMENT', id: assessmentId })
      console.log('Deleting assessment:', assessmentId)
      // In production, this would make an API call to delete from database
    } catch (error) {
      console.error('Failed to delete assessment:', error)
      throw error
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo variant="horizontal" width={160} priority />
            <div className="hidden sm:block">
              <p className="text-sm text-secondary font-medium tracking-wide">See beyond the busy.</p>
            </div>
          </div>
          <button
            onClick={handleOpenSettings}
            className="btn-primary px-4 py-2 rounded-pill flex items-center space-x-2 shadow-elevation-1"
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
          <div className="border-b border-neutral-600/20">
            <div className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('snippets')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-advance ${
                  activeTab === 'snippets'
                    ? 'border-accent-500 text-primary-600'
                    : 'border-transparent text-secondary hover:text-primary-600 hover:border-neutral-600/30'
                }`}
              >
                Weekly Snippets
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-advance ${
                  activeTab === 'performance'
                    ? 'border-accent-500 text-primary-600'
                    : 'border-transparent text-secondary hover:text-primary-600 hover:border-neutral-600/30'
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
            <div className="card bg-surface p-6">
              <h2 className="text-heading-2 text-primary mb-6">Your Snippets</h2>
              
              {/* Snippets List */}
              <nav className="space-y-2">
                {paginatedSnippets.map((snippet) => (
                  <button
                    key={snippet.id}
                    onClick={() => handleSelectSnippet(snippet)}
                    className={`w-full text-left p-4 rounded-card cursor-pointer transition-advance ${
                      selectedSnippet?.id === snippet.id
                        ? 'bg-primary-100 border-accent-500 border-2 shadow-elevation-1'
                        : isEditing && selectedSnippet?.id === snippet.id
                        ? 'bg-accent-500/10 border-accent-500/30 border'
                        : 'bg-neutral-100 hover:bg-primary-100/50'
                    }`}
                    aria-pressed={selectedSnippet?.id === snippet.id}
                  >
                    <div className="font-semibold text-primary">
                      Week {snippet.weekNumber}
                    </div>
                    <div className="text-sm text-secondary font-mono">
                      {formatDateRange(snippet.startDate, snippet.endDate)}
                    </div>
                  </button>
                ))}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    
                    <div className="text-sm text-gray-600">
                      {currentPage + 1} of {totalPages}
                    </div>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages - 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                )}
                
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
                  <MarkdownRenderer 
                    content={selectedSnippet.content}
                    className="min-h-32"
                  />
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
          <ErrorBoundary
            fallback={
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-red-800 font-semibold mb-2">Assessment Error</h3>
                <p className="text-red-600">Failed to load performance assessments. Please refresh the page.</p>
              </div>
            }
          >
            <PerformanceAssessmentComponent
              assessments={sortedAssessments}
              onGenerateDraft={handleGenerateDraft}
              onDeleteAssessment={handleDeleteAssessment}
            />
          </ErrorBoundary>
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
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

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
  const handleSave = useCallback(async (): Promise<void> => {
    await onSave(content)
  }, [content, onSave])

  return (
    <div className="space-y-4">
      {/* Editor Tabs */}
      <div className="border-b border-gray-200">
        <div className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'edit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content Editor/Preview */}
      {activeTab === 'edit' ? (
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
          placeholder="Describe what you accomplished this week and your plans for next week...

You can use Markdown formatting:
- **bold text** or __bold text__
- *italic text* or _italic text_
- [link](https://example.com)
- `inline code`
- ## Headings
- - List items
- > Blockquotes

Examples:
## Done
- **Implemented** user authentication system
- *Optimized* database queries by 40%
- Fixed critical bug in payment processing

## Next
- [ ] Start working on new dashboard
- [ ] Review code with team
- Research GraphQL implementation"
          aria-label="Snippet content editor"
        />
      ) : (
        <div className="w-full h-64 p-3 border border-gray-300 rounded-md bg-gray-50 overflow-y-auto">
          {content.trim() ? (
            <MarkdownRenderer content={content} className="text-sm" />
          ) : (
            <p className="text-gray-500 italic">Nothing to preview yet. Switch to Edit mode to add content.</p>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="text-sm text-gray-500">
          {activeTab === 'edit' ? 'Supports Markdown formatting' : 'Preview of your formatted content'}
        </div>
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
    </div>
  )
}