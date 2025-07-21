/**
 * Settings Constants
 * 
 * Centralized constants for the Settings component to ensure
 * consistency and maintainability.
 */

export const FILE_VALIDATION = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ] as const,
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.txt'] as const
} as const

export const VALIDATION_MESSAGES = {
  JOB_TITLE_REQUIRED: 'Job title is required',
  SENIORITY_LEVEL_REQUIRED: 'Please enter your seniority level',
  INVALID_FILE_TYPE: 'Please upload a PDF, Word document, or text file',
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  SAVE_ERROR: 'Failed to save settings. Please try again.'
} as const

export const FORM_FIELDS = {
  JOB_TITLE: 'jobTitle',
  SENIORITY_LEVEL: 'seniorityLevel', 
  CAREER_LADDER_FILE: 'careerLadderFile',
  PERFORMANCE_FEEDBACK: 'performanceFeedback',
  PERFORMANCE_FEEDBACK_FILE: 'performanceFeedbackFile'
} as const

export const ARIA_LABELS = {
  CLOSE_SETTINGS: 'Close settings',
  REMOVE_FILE: 'Remove file',
  REMOVE_FEEDBACK_FILE: 'Remove feedback file',
  UPLOAD_CAREER_LADDER: 'Upload career ladder file',
  UPLOAD_FEEDBACK: 'Upload performance feedback file'
} as const