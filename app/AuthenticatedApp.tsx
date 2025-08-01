'use client'

import React, { useState, useEffect, useCallback, useReducer, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Settings } from '../components/Settings'
import { CareerCheckInComponent } from '../components/CareerCheckIn'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { Logo } from '../components/Logo'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SafeImage } from '../components/SafeImage'
import { SettingsIcon, LogoutIcon } from '../components/icons'
import { PerformanceSettings } from '../types/settings'
import { PerformanceAssessment, AssessmentFormData, AssessmentContext, AssessmentAction, ASSESSMENT_CONSTANTS, CheckInFormData, CheckInContext } from '../types/performance'
import { llmProxy } from '../lib/llmproxy'
import { formatDateRangeWithYear } from '../lib/date-utils'
import { getCurrentWeekNumber } from '../lib/week-utils'

interface WeeklySnippet {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  content: string
}

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

const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, ASSESSMENT_CONSTANTS.MAX_CYCLE_NAME_LENGTH)
}

interface SnippetEditorProps {
  initialContent: string
  onSave: (content: string) => Promise<void>
  onCancel: () => void
}

export const AuthenticatedApp = (): JSX.Element => {
  const { data: session } = useSession()
  const currentUser = session?.user
  const router = useRouter()
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
  const [isLoadingData, setIsLoadingData] = useState(true)

  const sortedAssessments = useMemo(() => 
    [...assessments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assessments]
  )

  const SNIPPETS_PER_PAGE = 4
  const totalPages = Math.ceil(snippets.length / SNIPPETS_PER_PAGE)
  const startIndex = currentPage * SNIPPETS_PER_PAGE
  const endIndex = startIndex + SNIPPETS_PER_PAGE
  const paginatedSnippets = snippets.slice(startIndex, endIndex)
  
  useEffect(() => {
    setCurrentPage(0)
  }, [snippets.length])

  // Load dashboard data (onboarding already verified in root page)
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) {
        return
      }

      try {
        console.log('📊 Loading dashboard data for authenticated user...')
        
        // Fetch dashboard data in parallel
        const [snippetsResponse, assessmentsResponse] = await Promise.all([
          fetch('/api/snippets'),
          fetch('/api/assessments')
        ])

        // Handle snippets response
        if (snippetsResponse.ok) {
          const snippetsData = await snippetsResponse.json()
          setSnippets(snippetsData)
          
          if (snippetsData.length > 0) {
            setSelectedSnippet(snippetsData[0])
          }
        } else {
          console.error('Failed to fetch snippets:', {
            status: snippetsResponse.status,
            statusText: snippetsResponse.statusText,
            userEmail: currentUser?.email,
            timestamp: new Date().toISOString()
          })
          setSnippets([])
        }
        
        // Handle assessments response
        if (assessmentsResponse.ok) {
          const assessmentsData = await assessmentsResponse.json()
          dispatch({ type: 'SET_ASSESSMENTS', payload: assessmentsData })
        } else {
          console.error('Failed to fetch assessments:', {
            status: assessmentsResponse.status,
            statusText: assessmentsResponse.statusText,
            userEmail: currentUser?.email,
            timestamp: new Date().toISOString()
          })
          dispatch({ type: 'SET_ASSESSMENTS', payload: [] })
        }
        
        console.log('✅ Dashboard data loaded successfully')
      } catch (error) {
        console.error('Error fetching dashboard data:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userEmail: currentUser?.email,
          timestamp: new Date().toISOString()
        })
        setSnippets([])
        dispatch({ type: 'SET_ASSESSMENTS', payload: [] })
      } finally {
        setIsLoadingData(false)
      }
    }

    loadDashboardData()
  }, [currentUser])

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
        console.error('Failed to save reflection:', response.statusText)
      }
    } catch (error) {
      console.error('Error saving reflection:', error)
    }
  }, [selectedSnippet, snippets])

  const getCurrentWeek = useCallback((): number => {
    return getCurrentWeekNumber()
  }, [])

  const formatDateRange = useCallback((startDate: string, endDate: string): string => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return formatDateRangeWithYear(start, end)
  }, [])

  const handleSelectSnippet = useCallback((snippet: WeeklySnippet): void => {
    setSelectedSnippet(snippet)
    setIsEditing(false)
  }, [])

  const handlePreviousPage = useCallback((): void => {
    setCurrentPage(prev => Math.max(0, prev - 1))
  }, [])

  const handleNextPage = useCallback((): void => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
  }, [totalPages])

  const handleToggleEdit = useCallback((): void => {
    setIsEditing(!isEditing)
  }, [isEditing])

  const handleCancelEdit = useCallback((): void => {
    setIsEditing(false)
  }, [])

  const handleOpenSettings = useCallback((): void => {
    setShowSettings(true)
  }, [])

  const handleCloseSettings = useCallback((): void => {
    setShowSettings(false)
  }, [])

  const handleSaveSettings = useCallback(async (settings: PerformanceSettings): Promise<void> => {
    setUserSettings(settings)
    setShowSettings(false)
  }, [])

  const handleGenerateDraft = useCallback(async (request: CheckInFormData): Promise<void> => {
    const sanitizedRequest = {
      cycleName: sanitizeInput(request.cycleName),
      startDate: request.startDate,
      endDate: request.endDate,
      checkInFocusAreas: request.checkInFocusAreas ? 
        sanitizeInput(request.checkInFocusAreas) : undefined
    }

    try {
      console.log(`🔄 Generating assessment for ${sanitizedRequest.cycleName}...`)
      
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
      alert(`Failed to generate assessment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [dispatch])

  const handleDeleteAssessment = useCallback(async (assessmentId: string): Promise<void> => {
    try {
      dispatch({ type: 'REMOVE_ASSESSMENT', id: assessmentId })
      console.log('Deleting assessment:', assessmentId)
    } catch (error) {
      console.error('Failed to delete assessment:', error)
      throw error
    }
  }, [])

  const handleAddCurrentWeek = useCallback(async (): Promise<void> => {
    try {
      const currentWeek = getCurrentWeek()
      
      const existingSnippet = snippets.find(snippet => snippet.weekNumber === currentWeek)
      if (existingSnippet) {
        setSelectedSnippet(existingSnippet)
        setIsEditing(true)
        return
      }

      const response = await fetch('/api/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekNumber: currentWeek,
          year: new Date().getFullYear(),
          content: '## Done\n\n- \n\n## Next\n\n- \n\n## Notes\n\n'
        })
      })

      if (response.ok) {
        const newSnippet = await response.json()
        
        const updatedSnippets = [newSnippet, ...snippets]
        setSnippets(updatedSnippets)
        setSelectedSnippet(newSnippet)
        setIsEditing(true)
        
        setCurrentPage(0)
      } else {
        console.error('Failed to create reflection:', response.statusText)
        alert('Failed to create new reflection. Please try again.')
      }
    } catch (error) {
      console.error('Error creating reflection:', error)
      alert('Failed to create new snippet. Please try again.')
    }
  }, [getCurrentWeek, snippets])

  const handleSignOut = () => {
    // Use window.location.origin to get the current domain in production
    // This ensures we redirect to the custom domain (.io) instead of the GCP URL
    const callbackUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin
      : '/';
    
    signOut({ callbackUrl })
  }

  // Show loading overlay while loading dashboard data (non-blocking)
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <LoadingSpinner size="lg" />
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Loading<span className="animate-pulse">...</span>
            </h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          {/* Mobile Layout */}
          <div className="block md:hidden">
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col items-start">
                <Logo variant="horizontal" width={120} priority />
                <p className="text-xs text-secondary opacity-75 mt-1">See beyond the busy.</p>
              </div>
              <div className="flex items-center space-x-2">
                {currentUser && (
                  <SafeImage
                    src={currentUser.image}
                    alt={currentUser.name ? `${currentUser.name}'s profile picture` : 'User profile picture'}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <button
                  onClick={handleOpenSettings}
                  className="btn-primary p-2 rounded-full shadow-elevation-1 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center"
                  aria-label="Open settings"
                  aria-describedby="mobile-settings-desc"
                >
                  <SettingsIcon />
                  <span id="mobile-settings-desc" className="sr-only">Open application settings and preferences</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-secondary hover:text-primary-600 transition-advance p-2 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center rounded-md"
                  aria-label="Sign out of your account"
                  aria-describedby="mobile-signout-desc"
                >
                  <LogoutIcon />
                  <span id="mobile-signout-desc" className="sr-only">Sign out of your account and return to login</span>
                </button>
              </div>
            </div>
            {currentUser && (
              <div className="text-center">
                <p className="text-sm text-secondary font-medium">Welcome back, {currentUser.name}</p>
              </div>
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-start">
                <Logo variant="horizontal" width={120} priority />
                <p className="text-sm text-secondary font-medium tracking-wide mt-1 hidden lg:block">See beyond the busy.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-3">
                  <SafeImage
                    src={currentUser.image}
                    alt={currentUser.name ? `${currentUser.name}'s profile picture` : 'User profile picture'}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-secondary hidden lg:block">
                    {currentUser.name}
                  </span>
                </div>
              )}
              <button
                onClick={handleOpenSettings}
                className="btn-primary px-4 py-2 rounded-pill flex items-center space-x-2 shadow-elevation-1"
                aria-label="Open performance cycle settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden xl:inline">Settings</span>
              </button>
              <button
                onClick={handleSignOut}
                className="text-secondary hover:text-primary-600 transition-advance px-3 py-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <nav className="mb-8">
          <div className="border-b border-neutral-600/20">
            <div className="-mb-px flex gap-4 md:gap-8 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('snippets')}
                className={`py-3 px-2 md:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-advance min-w-fit focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                  activeTab === 'snippets'
                    ? 'border-accent-500 text-primary-600'
                    : 'border-transparent text-secondary hover:text-primary-600 hover:border-neutral-600/30'
                }`}
                role="tab"
                aria-selected={activeTab === 'snippets'}
                aria-controls="snippets-panel"
                id="snippets-tab"
              >
Weekly Reflections
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-3 px-2 md:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-advance min-w-fit focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                  activeTab === 'performance'
                    ? 'border-accent-500 text-primary-600'
                    : 'border-transparent text-secondary hover:text-primary-600 hover:border-neutral-600/30'
                }`}
                role="tab"
                aria-selected={activeTab === 'performance'}
                aria-controls="performance-panel"
                id="performance-tab"
              >
                Career Check-In Drafts
              </button>
            </div>
          </div>
        </nav>
        
        <div 
          role="tabpanel" 
          aria-labelledby={activeTab === 'snippets' ? 'snippets-tab' : 'performance-tab'}
          id={activeTab === 'snippets' ? 'snippets-panel' : 'performance-panel'}
        >
        {activeTab === 'snippets' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          <aside className="lg:col-span-1">
            <div className="card bg-white p-4 md:p-6">
              <h2 className="text-heading-2 text-primary mb-4 md:mb-6">Your Reflections</h2>
              
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
                
                {/* Calendar Integration Prompt */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <svg className="flex-shrink-0 w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Get more from your reflections</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Connect your Google Calendar to automatically include meeting context in your weekly reflections.
                      </p>
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Connect calendar in Settings →
                      </button>
                    </div>
                  </div>
                </div>
                
                {!snippets.find(snippet => snippet.weekNumber === getCurrentWeek()) && (
                  <button 
                    onClick={handleAddCurrentWeek}
                    className="w-full p-3 border-2 border-dashed border-neutral-600/30 rounded-card text-secondary hover:border-primary-600/50 hover:text-primary-600 hover:bg-primary-100/30 transition-advance focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                    aria-label="Add current week reflection"
                    title={`Add reflection for week ${getCurrentWeek()}`}
                  >
                    + Add Current Week (Week {getCurrentWeek()})
                  </button>
                )}
              </nav>
            </div>
          </aside>

          <main className="lg:col-span-2">
            {selectedSnippet ? (
              <article className="bg-white rounded-lg shadow-md p-4 md:p-6">
                <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Week {selectedSnippet.weekNumber} - {formatDateRange(selectedSnippet.startDate, selectedSnippet.endDate)}
                  </h2>
                  <button
                    onClick={handleToggleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 self-start sm:self-auto"
                    aria-label={isEditing ? 'Cancel editing' : 'Edit reflection'}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </header>

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
              <div className="bg-white rounded-lg shadow-md p-4 md:p-6 text-center text-gray-500">
                <p>Select a reflection to view or edit</p>
              </div>
            )}
          </main>
        </div>
        ) : (
          <ErrorBoundary
            fallback={
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-red-800 font-semibold mb-2">Assessment Error</h3>
                <p className="text-red-600">Failed to load performance assessments. Please refresh the page.</p>
              </div>
            }
          >
            <CareerCheckInComponent
              assessments={sortedAssessments}
              onGenerateDraft={handleGenerateDraft}
              onDeleteAssessment={handleDeleteAssessment}
            />
          </ErrorBoundary>
        )}
        </div>

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

function SnippetEditor({ 
  initialContent, 
  onSave, 
  onCancel 
}: SnippetEditorProps): JSX.Element {
  const [content, setContent] = useState<string>(initialContent)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(event.target.value)
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    await onSave(content)
  }, [content, onSave])

  return (
    <div className="space-y-4">
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

      {activeTab === 'edit' ? (
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
          placeholder="Describe what you accomplished this week and your plans for next week..."
          aria-label="Reflection content editor"
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
      
      <div className="flex justify-between">
        <div className="text-sm text-gray-500">
          {activeTab === 'edit' ? 'Supports Markdown formatting' : 'Preview of your formatted content'}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Save reflection changes"
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