/**
 * Combined Role Selection and Career Guidelines Component
 * Handles role/level selection and immediate guideline generation/display
 */

'use client'

import React, { useState, useEffect } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { VALID_ROLES, VALID_LEVELS, ROLE_LABELS, LEVEL_LABELS } from '../constants/user'

// Constants
const ROLES = VALID_ROLES.map(role => ({
  value: role,
  label: ROLE_LABELS[role],
}))

const LEVELS = VALID_LEVELS.map(level => ({
  value: level,
  label: LEVEL_LABELS[level],
}))

interface RoleAndGuidelinesStepProps {
  initialRole?: string
  initialLevel?: string
  initialCustomRole?: string
  initialCustomLevel?: string
  initialCareerGuidelines?: {
    currentLevelPlan: string
    nextLevelExpectations: string
    companyLadder?: string
  }
  onComplete: (data: {
    role: string
    customRole: string
    level: string
    customLevel: string
    careerGuidelines: {
      currentLevelPlan: string
      nextLevelExpectations: string
      companyLadder?: string
    }
  }) => void
}

export function RoleAndGuidelinesStep({
  initialRole = '',
  initialLevel = '',
  initialCustomRole = '',
  initialCustomLevel = '',
  initialCareerGuidelines,
  onComplete
}: RoleAndGuidelinesStepProps) {
  // Role and level selection state
  const [role, setRole] = useState(initialRole)
  const [customRole, setCustomRole] = useState(initialCustomRole)
  const [level, setLevel] = useState(initialLevel)
  const [customLevel, setCustomLevel] = useState(initialCustomLevel)
  
  // Career guidelines state
  const [currentLevelPlan, setCurrentLevelPlan] = useState(initialCareerGuidelines?.currentLevelPlan || '')
  const [nextLevelExpectations, setNextLevelExpectations] = useState(initialCareerGuidelines?.nextLevelExpectations || '')
  const [companyLadder, setCompanyLadder] = useState(initialCareerGuidelines?.companyLadder || '')
  const [showCompanyLadderUpload, setShowCompanyLadderUpload] = useState(false)
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [extractedFromDocument, setExtractedFromDocument] = useState(false)
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGeneratedGuidelines, setHasGeneratedGuidelines] = useState(false)

  // Check if current selection is a standard role/level combo
  const isStandardCombo = () => {
    const effectiveRole = role === 'other' ? '' : role
    const effectiveLevel = level === 'other' ? '' : level
    return effectiveRole && effectiveLevel && VALID_ROLES.includes(effectiveRole as any) && VALID_LEVELS.includes(effectiveLevel as any)
  }

  // Check if we can generate guidelines
  const canGenerate = () => {
    const effectiveRole = role === 'other' ? customRole.trim() : role
    const effectiveLevel = level === 'other' ? customLevel.trim() : level
    return effectiveRole && effectiveLevel && !hasGeneratedGuidelines && !isUploading
  }

  // Handle file upload and parsing
  const handleFileUpload = async (file: File) => {
    const effectiveRole = role === 'other' ? customRole : role
    const effectiveLevel = level === 'other' ? customLevel : level
    
    if (!effectiveRole || !effectiveLevel) {
      setError('Please select both role and level before uploading')
      return
    }

    setIsUploading(true)
    setIsLoading(true) // Show same loading state as generate button
    setUploadSuccess(false)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('role', effectiveRole)
      formData.append('level', effectiveLevel)

      const response = await fetch('/api/career-guidelines/upload', {
        method: 'POST',
        headers: {
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError(`${data.message}\n\nSuggestions:\n${data.suggestions?.join('\n') || ''}`)
        } else {
          throw new Error(data.error || 'Failed to process document')
        }
        return
      }

      // Success - use extracted guidelines
      setCurrentLevelPlan(data.currentLevelPlan || '')
      setNextLevelExpectations(data.nextLevelExpectations || '')
      setHasGeneratedGuidelines(true)
      setExtractedFromDocument(true)
      setUploadSuccess(true)
      setUploadedFile(file)
      
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err instanceof Error ? err.message : 'Failed to process career ladder document')
    } finally {
      setIsUploading(false)
      setIsLoading(false) // Clear loading state like generate button
    }
  }

  // Generate or fetch guidelines
  const generateGuidelines = async () => {
    const effectiveRole = role === 'other' ? customRole : role
    const effectiveLevel = level === 'other' ? customLevel : level
    
    if (!effectiveRole || !effectiveLevel) {
      setError('Please select both role and level')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // First try to fetch from templates (for standard combos)
      if (isStandardCombo()) {
        const response = await fetch(
          `/api/career-guidelines/template?role=${encodeURIComponent(effectiveRole)}&level=${encodeURIComponent(effectiveLevel)}`,
          {
            headers: {
              'X-Dev-User-Id': 'dev-user-123'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          setCurrentLevelPlan(data.currentLevelPlan || '')
          setNextLevelExpectations(data.nextLevelExpectations || '')
          setHasGeneratedGuidelines(true)
          setExtractedFromDocument(false)
          setIsLoading(false)
          return
        }
      }
      
      // If no template or custom role/level, generate with LLM
      const response = await fetch('/api/career-guidelines/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: JSON.stringify({
          role: effectiveRole,
          level: effectiveLevel,
          companyLadder: companyLadder || undefined
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate guidelines')
      }
      
      const data = await response.json()
      setCurrentLevelPlan(data.currentLevelPlan || '')
      setNextLevelExpectations(data.nextLevelExpectations || '')
      setHasGeneratedGuidelines(true)
      setExtractedFromDocument(false)
    } catch (err) {
      console.error('Error generating guidelines:', err)
      setError('Failed to generate career guidelines. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle role/level changes - reset guidelines
  const handleRoleChange = (newRole: string, newCustomRole?: string) => {
    setRole(newRole)
    if (newCustomRole !== undefined) setCustomRole(newCustomRole)
    // Reset guidelines when role changes
    if (hasGeneratedGuidelines) {
      setCurrentLevelPlan('')
      setNextLevelExpectations('')
      setHasGeneratedGuidelines(false)
    }
  }

  const handleLevelChange = (newLevel: string, newCustomLevel?: string) => {
    setLevel(newLevel)
    if (newCustomLevel !== undefined) setCustomLevel(newCustomLevel)
    // Reset guidelines when level changes
    if (hasGeneratedGuidelines) {
      setCurrentLevelPlan('')
      setNextLevelExpectations('')
      setHasGeneratedGuidelines(false)
    }
  }

  const handleContinue = () => {
    const effectiveRole = role === 'other' ? customRole : role
    const effectiveLevel = level === 'other' ? customLevel : level
    
    onComplete({
      role,
      customRole,
      level,
      customLevel,
      careerGuidelines: {
        currentLevelPlan,
        nextLevelExpectations,
        companyLadder
      }
    })
  }

  const canContinue = () => {
    const effectiveRole = role === 'other' ? customRole.trim() : role
    const effectiveLevel = level === 'other' ? customLevel.trim() : level
    return effectiveRole && effectiveLevel && currentLevelPlan && nextLevelExpectations
  }

  // Sanitize custom input
  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/[<>\"'&]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 100)
  }

  return (
    <div className="space-y-8">
      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          What&apos;s your role? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {ROLES.filter(r => r.value !== 'other').map(r => (
            <button
              key={r.value}
              onClick={() => handleRoleChange(r.value, '')}
              className={`p-4 rounded-lg border-2 transition-all ${
                role === r.value
                  ? 'border-accent-500 bg-accent-50 text-accent-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="role"
              checked={role === 'other'}
              onChange={() => handleRoleChange('other')}
              className="text-accent-500"
            />
            <span className="text-sm font-medium text-gray-700">Other:</span>
          </label>
          <input
            type="text"
            value={role === 'other' ? customRole : ''}
            onChange={(e) => handleRoleChange('other', sanitizeInput(e.target.value))}
            placeholder="Enter your role (e.g., Solutions Architect)"
            className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50"
            disabled={role !== 'other'}
          />
        </div>
      </div>
      
      {/* Level Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          What&apos;s your level? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {LEVELS.filter(l => l.value !== 'other').map(l => (
            <button
              key={l.value}
              onClick={() => handleLevelChange(l.value, '')}
              className={`p-3 rounded-lg border-2 transition-all ${
                level === l.value
                  ? 'border-accent-500 bg-accent-50 text-accent-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="level"
              checked={level === 'other'}
              onChange={() => handleLevelChange('other')}
              className="text-accent-500"
            />
            <span className="text-sm font-medium text-gray-700">Other:</span>
          </label>
          <input
            type="text"
            value={level === 'other' ? customLevel : ''}
            onChange={(e) => handleLevelChange('other', sanitizeInput(e.target.value))}
            placeholder="Enter your level (e.g., Lead, Principal)"
            className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-50"
            disabled={level !== 'other'}
          />
        </div>
      </div>

      {/* Company Ladder Upload Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg className="flex-shrink-0 w-6 h-6 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Get Exact Guidelines from Your Company&apos;s Career Ladder
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              <strong>Upload your career ladder document</strong> and we&apos;ll extract the exact expectations for your role and level.
            </p>
            <ul className="text-sm text-blue-700 space-y-1 mb-4">
              <li>• Extract role-specific criteria from your company document</li>
              <li>• Get promotion requirements as written by your organization</li>
              <li>• Receive feedback aligned with your company&apos;s framework</li>
              <li>• Document stays private and secure to your account</li>
            </ul>
            
            {uploadSuccess ? (
              <div className="bg-green-100 border border-green-300 rounded-md p-3 mb-3">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-800 font-medium">
                    Successfully extracted guidelines from &quot;{uploadedFile?.name}&quot;
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="career-ladder-upload"
                    accept=".txt,.pdf,.doc,.docx,.md"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="hidden"
                    disabled={isUploading || !role || !level}
                  />
                  <label
                    htmlFor="career-ladder-upload"
                    className={`cursor-pointer ${(!role || !level) ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isUploading ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner size="sm" />
                          <span className="text-sm text-blue-700">Processing document...</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-blue-700">
                            Click to upload career ladder document
                          </span>
                          <span className="text-xs text-blue-600">
                            PDF, Word, Text, or Markdown files
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </div>
                
                {(!role || !level) && (
                  <p className="text-xs text-blue-600">
                    Select your role and level first to enable document upload
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Processing Loading State */}
      {isUploading && (
        <div className="flex justify-center">
          <div className="px-8 py-3 bg-blue-500 text-white rounded-full font-semibold shadow-md flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span>Processing Document...</span>
          </div>
        </div>
      )}

      {/* Generate Button */}
      {canGenerate() && (
        <div className="flex justify-center">
          <button
            onClick={generateGuidelines}
            disabled={isLoading}
            className="px-8 py-3 bg-accent-500 text-white rounded-full font-semibold shadow-md hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>{isUploading ? 'Processing Document...' : 'Generating Guidelines...'}</span>
              </div>
            ) : (
              'Generate Career Guidelines'
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Career Guidelines Display */}
      {hasGeneratedGuidelines && !isLoading && (
        <div className="space-y-6"
             style={{ animation: 'fadeIn 0.5s ease-in' }}>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Career Guidelines
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {extractedFromDocument ? (
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Extracted from your company&apos;s career ladder document
                </span>
              ) : (
                'Review and customize these guidelines to match your goals'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Level */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Current Level: {level === 'other' ? customLevel : LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]} {role === 'other' ? customRole : ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
              </label>
              <textarea
                value={currentLevelPlan}
                onChange={(e) => setCurrentLevelPlan(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg text-sm resize-none"
                rows={10}
              />
            </div>

            {/* Next Level */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Next Level Expectations
              </label>
              <textarea
                value={nextLevelExpectations}
                onChange={(e) => setNextLevelExpectations(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg text-sm resize-none"
                rows={10}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            These guidelines will help AI provide better feedback on your weekly reflections
          </p>
        </div>
      )}

      {/* Continue Button */}
      {hasGeneratedGuidelines && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleContinue}
            disabled={!canContinue()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}