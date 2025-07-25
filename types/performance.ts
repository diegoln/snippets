/**
 * Performance Assessment Type Definitions
 * 
 * Type definitions for the Performance Assessment feature
 * that allows users to create self-assessment drafts based on
 * their weekly snippets and career context.
 */

/**
 * Performance self assessment draft interface
 */
export interface PerformanceAssessment {
  id: string
  userId: string
  cycleName: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  generatedDraft: string // AI-generated draft content
  isGenerating?: boolean // True while draft is being generated
  createdAt: string
  updatedAt: string
}

/**
 * Props for the PerformanceAssessment component
 */
export interface PerformanceAssessmentProps {
  assessments: PerformanceAssessment[]
  onGenerateDraft: (request: AssessmentFormData) => Promise<void>
  onDeleteAssessment: (assessmentId: string) => Promise<void>
}

/**
 * Form data for creating a new performance assessment
 */
export interface AssessmentFormData {
  cycleName: string
  startDate: string
  endDate: string
  assessmentDirections?: string
}

/**
 * Context data sent to LLMProxy for draft generation
 */
export interface AssessmentContext {
  userProfile: {
    jobTitle: string
    seniorityLevel: string
    careerLadder?: string
  }
  weeklySnippets: Array<{
    weekNumber: number
    startDate: string
    endDate: string
    content: string
  }>
  previousFeedback?: string
  assessmentDirections?: string
  cyclePeriod: {
    startDate: string
    endDate: string
    cycleName: string
  }
  snippetCount?: number
}

/**
 * LLMProxy request for performance assessment draft generation
 */
export interface LLMGenerationRequest {
  prompt: string
  context: AssessmentContext
  maxTokens: number
  temperature: number
}

/**
 * Form validation errors
 */
export type PerformanceAssessmentErrors = {
  cycleName?: string
  startDate?: string
  endDate?: string
  assessmentDirections?: string
  general?: string
}

/**
 * Assessment generation status states
 */
export type GenerationState = 
  | { type: 'idle' }
  | { type: 'generating' }
  | { type: 'success' }
  | { type: 'error'; message: string }

/**
 * Form UI states
 */
export type FormState = 
  | { type: 'closed' }
  | { type: 'open' }
  | { type: 'submitting' }

/**
 * Combined UI state for the performance assessment component
 */
export interface PerformanceAssessmentState {
  formState: FormState
  generationState: GenerationState
  formData: AssessmentFormData
  errors: PerformanceAssessmentErrors
  selectedAssessment: PerformanceAssessment | null
}

/**
 * Actions for assessment state management
 */
export type AssessmentAction = 
  | { type: 'ADD_ASSESSMENT'; payload: PerformanceAssessment }
  | { type: 'UPDATE_ASSESSMENT'; id: string; updates: Partial<PerformanceAssessment> }
  | { type: 'REMOVE_ASSESSMENT'; id: string }
  | { type: 'SET_ASSESSMENTS'; payload: PerformanceAssessment[] }

/**
 * Actions for UI state management
 */
export type UIStateAction = 
  | { type: 'OPEN_FORM' }
  | { type: 'CLOSE_FORM' }
  | { type: 'START_GENERATION' }
  | { type: 'GENERATION_SUCCESS' }
  | { type: 'GENERATION_ERROR'; message: string }
  | { type: 'SET_FORM_DATA'; data: Partial<AssessmentFormData> }
  | { type: 'SET_ERRORS'; errors: PerformanceAssessmentErrors }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SELECT_ASSESSMENT'; assessment: PerformanceAssessment | null }

/**
 * Configuration constants
 */
export const ASSESSMENT_CONSTANTS = {
  GENERATION_DELAY_MIN: 3000,
  GENERATION_DELAY_MAX: 5000,
  DRAFT_PREVIEW_LENGTH: 200,
  MAX_CYCLE_NAME_LENGTH: 100,
  MAX_DIRECTIONS_LENGTH: 1000
} as const