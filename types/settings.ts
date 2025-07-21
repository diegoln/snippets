/**
 * Settings Type Definitions
 * 
 * Centralized type definitions for the Settings component
 * to ensure type safety and consistency.
 */

/**
 * User performance cycle settings interface
 */
export interface PerformanceSettings {
  jobTitle: string
  seniorityLevel: string
  careerLadderFile: File | null
  performanceFeedback: string
  performanceFeedbackFile: File | null
}

/**
 * Settings component props
 */
export interface SettingsProps {
  onSave: (settings: PerformanceSettings) => Promise<void>
  onClose: () => void
  initialSettings?: Partial<PerformanceSettings>
}

/**
 * Form validation errors
 */
export type SettingsErrors = Partial<Record<keyof PerformanceSettings, string>>

/**
 * Form submission state
 */
export interface FormState {
  isSubmitting: boolean
  submitError: string | null
  hasUnsavedChanges: boolean
}

/**
 * File upload status
 */
export interface FileUploadStatus {
  isUploading: boolean
  progress?: number
  error?: string
}

/**
 * Settings form field names as const assertions
 */
export type SettingsFieldName = keyof PerformanceSettings