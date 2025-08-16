/**
 * Career Check-In Type Definitions
 * 
 * Type definitions for the Career Check-In feature
 * that allows users to create career check-in documents based on
 * their weekly snippets and career context.
 */

// Integration consolidation types
export interface Evidence {
  statement: string
  attribution: 'USER' | 'TEAM'
}

export interface Category {
  name: string
  evidence: Evidence[]
}

export interface Theme {
  name: string
  categories: Category[]
}

export interface Metrics {
  totalMeetings?: number
  meetingHours?: number
  [key: string]: any
}

/**
 * Career check-in document interface
 */
export interface CareerCheckIn {
  id: string
  userId: string
  cycleName: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  generatedDraft: string // AI-generated draft content
  isGenerating?: boolean // True while draft is being generated
  createdAt: string
  updatedAt: string
  checkInFocusAreas?: string
}

// Legacy alias for backward compatibility
export type PerformanceAssessment = CareerCheckIn

/**
 * Props for the CareerCheckIn component
 */
export interface CareerCheckInProps {
  assessments: CareerCheckIn[]
  onGenerateDraft: (request: CheckInFormData) => Promise<void>
  onDeleteAssessment: (assessmentId: string) => Promise<void>
}

// Legacy alias for backward compatibility  
export type PerformanceAssessmentProps = CareerCheckInProps

/**
 * Form data for creating a new career check-in
 */
export interface CheckInFormData {
  cycleName: string
  startDate: string
  endDate: string
  checkInFocusAreas?: string
}

// Legacy alias for backward compatibility
export type AssessmentFormData = CheckInFormData

/**
 * Context data sent to LLMProxy for check-in generation
 */
export interface CheckInContext {
  userProfile: {
    jobTitle: string
    seniorityLevel: string
    careerLadder?: string
  }
  consolidatedData: Array<{
    weekNumber: number
    year: number
    startDate: string
    endDate: string
    integrationType: string
    summary: string
    themes: Theme[]
    keyInsights: string[]
    metrics: Metrics
  }>
  previousFeedback?: string
  checkInFocusAreas?: string
  cyclePeriod: {
    startDate: string
    endDate: string
    cycleName: string
  }
  consolidationCount?: number
}

/**
 * LLMProxy request for career check-in generation
 */
export interface LLMGenerationRequest {
  prompt: string
  context: CheckInContext
  maxTokens: number
  temperature: number
}

// Legacy alias for backward compatibility
export type AssessmentContext = CheckInContext

/**
 * Form validation errors
 */
export type CareerCheckInErrors = {
  cycleName?: string
  startDate?: string
  endDate?: string
  checkInFocusAreas?: string
  general?: string
}

// Legacy alias for backward compatibility
export type PerformanceAssessmentErrors = CareerCheckInErrors

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
 * Combined UI state for the career check-in component
 */
export interface CareerCheckInState {
  formState: FormState
  generationState: GenerationState
  formData: CheckInFormData
  errors: CareerCheckInErrors
  selectedCheckIn: CareerCheckIn | null
}

// Legacy alias for backward compatibility
export type PerformanceAssessmentState = {
  formState: FormState
  generationState: GenerationState
  formData: AssessmentFormData
  errors: PerformanceAssessmentErrors
  selectedAssessment: PerformanceAssessment | null
}

/**
 * Actions for check-in state management
 */
export type CheckInAction = 
  | { type: 'ADD_CHECKIN'; payload: CareerCheckIn }
  | { type: 'UPDATE_CHECKIN'; id: string; updates: Partial<CareerCheckIn> }
  | { type: 'REMOVE_CHECKIN'; id: string }
  | { type: 'SET_CHECKINS'; payload: CareerCheckIn[] }

// Legacy aliases for backward compatibility
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
  | { type: 'SET_FORM_DATA'; data: Partial<CheckInFormData> }
  | { type: 'SET_ERRORS'; errors: CareerCheckInErrors }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SELECT_CHECKIN'; checkIn: CareerCheckIn | null }
  // Legacy action for backward compatibility
  | { type: 'SELECT_ASSESSMENT'; assessment: PerformanceAssessment | null }

/**
 * Configuration constants
 */
export const CHECKIN_CONSTANTS = {
  GENERATION_DELAY_MIN: 3000,
  GENERATION_DELAY_MAX: 5000,
  DRAFT_PREVIEW_LENGTH: 200,
  MAX_CYCLE_NAME_LENGTH: 100,
  MAX_FOCUS_AREAS_LENGTH: 1000
} as const

// Legacy alias for backward compatibility
export const ASSESSMENT_CONSTANTS = CHECKIN_CONSTANTS