'use client'

import React, { useState, useEffect, useCallback, useReducer, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Settings } from '../components/Settings'
import { PerformanceAssessmentComponent } from '../components/PerformanceAssessment'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { Logo } from '../components/Logo'
import { PerformanceSettings } from '../types/settings'
import { PerformanceAssessment, AssessmentFormData, AssessmentContext, AssessmentAction, ASSESSMENT_CONSTANTS } from '../types/performance'
import { llmProxy } from '../lib/llmproxy'
import { formatDateRangeWithYear } from '../lib/date-utils'

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

  useEffect(() => {
    const fetchSnippets = async () => {
      try {
        const response = await fetch('/api/snippets')
        if (response.ok) {
          const snippetsData = await response.json()
          setSnippets(snippetsData)
          
          if (snippetsData.length > 0) {
            setSelectedSnippet(snippetsData[0])
          }
        } else {
          console.error('Failed to fetch snippets:', response.statusText)
          setSnippets([])
        }
      } catch (error) {
        console.error('Error fetching snippets:', error)
        setSnippets([])
      }
    }

    fetchSnippets()

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
      }
    } catch (error) {
      console.error('Error saving snippet:', error)
    }
  }, [selectedSnippet, snippets])

  const getCurrentWeek = useCallback((): number => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + startOfYear.getDay() + 1) / 7)
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
    console.log('Saving settings:', settings)
  }, [])

  const handleGenerateDraft = useCallback(async (request: AssessmentFormData): Promise<void> => {
    const sanitizedRequest = {
      cycleName: sanitizeInput(request.cycleName),
      startDate: request.startDate,
      endDate: request.endDate,
      assessmentDirections: request.assessmentDirections ? 
        sanitizeInput(request.assessmentDirections) : undefined
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
        console.error('Failed to create snippet:', response.statusText)
        alert('Failed to create new snippet. Please try again.')
      }
    } catch (error) {
      console.error('Error creating snippet:', error)
      alert('Failed to create new snippet. Please try again.')
    }
  }, [getCurrentWeek, snippets])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo variant="horizontal" width={160} priority />
            <div className="hidden sm:block">
              <p className="text-sm text-secondary font-medium tracking-wide">See beyond the busy.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser && (
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser.image || ''}
                  alt={currentUser.name || ''}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm text-secondary">
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
              <span>Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              className="text-secondary hover:text-primary-600 transition-advance px-3 py-2"
            >
              Sign Out
            </button>
          </div>
        </header>

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
        
        {activeTab === 'snippets' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <aside className="lg:col-span-1">
            <div className="card bg-white p-6">
              <h2 className="text-heading-2 text-primary mb-6">Your Snippets</h2>
              
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
                
                <button 
                  onClick={handleAddCurrentWeek}
                  className="w-full p-3 border-2 border-dashed border-neutral-600/30 rounded-card text-secondary hover:border-primary-600/50 hover:text-primary-600 hover:bg-primary-100/30 transition-advance focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                  aria-label="Add current week snippet"
                >
                  + Add Current Week
                </button>
              </nav>
            </div>
          </aside>

          <main className="lg:col-span-2">
            {selectedSnippet ? (
              <article className="bg-white rounded-lg shadow-md p-6">
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
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                <p>Select a snippet to view or edit</p>
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
            <PerformanceAssessmentComponent
              assessments={sortedAssessments}
              onGenerateDraft={handleGenerateDraft}
              onDeleteAssessment={handleDeleteAssessment}
            />
          </ErrorBoundary>
        )}

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