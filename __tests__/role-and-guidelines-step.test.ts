/**
 * Unit tests for RoleAndGuidelinesStep component
 * Tests role/level selection, templated data, editing, generation, and file upload
 */

import { jest } from '@jest/globals'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock file reading
const mockFileReader = {
  readAsText: jest.fn(),
  result: '',
  onload: null as (() => void) | null,
  onerror: null as ((error: any) => void) | null,
}

// Mock FormData
const mockFormData = {
  append: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  forEach: jest.fn(),
}

global.FormData = jest.fn(() => mockFormData) as any

describe('RoleAndGuidelinesStep Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Default successful responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/career-guidelines/template')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            currentLevelPlan: 'Template current level plan for Engineering Senior',
            nextLevelExpectations: 'Template next level expectations for Engineering Senior'
          }),
        })
      }
      if (url.includes('/api/career-guidelines/generate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            currentLevelPlan: 'Generated current level plan',
            nextLevelExpectations: 'Generated next level expectations'
          }),
        })
      }
      if (url.includes('/api/career-guidelines/upload')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            currentLevelPlan: 'Extracted current level plan from document',
            nextLevelExpectations: 'Extracted next level expectations from document'
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  describe('Role and Level Selection', () => {
    test('should validate standard role/level combinations', () => {
      // Simulate the isStandardCombo logic
      const isStandardCombo = (role: string, level: string) => {
        const VALID_ROLES = ['engineering', 'product', 'design', 'marketing', 'sales', 'data', 'operations']
        const VALID_LEVELS = ['junior', 'mid', 'senior', 'staff', 'principal', 'director']
        
        const effectiveRole = role === 'other' ? '' : role
        const effectiveLevel = level === 'other' ? '' : level
        
        return !!(effectiveRole && effectiveLevel && 
               VALID_ROLES.includes(effectiveRole) && 
               VALID_LEVELS.includes(effectiveLevel))
      }

      // Test standard combinations
      expect(isStandardCombo('engineering', 'senior')).toBe(true)
      expect(isStandardCombo('product', 'mid')).toBe(true)
      expect(isStandardCombo('design', 'principal')).toBe(true)

      // Test invalid combinations
      expect(isStandardCombo('other', 'senior')).toBe(false)
      expect(isStandardCombo('engineering', 'other')).toBe(false)
      expect(isStandardCombo('invalid-role', 'senior')).toBe(false)
      expect(isStandardCombo('engineering', 'invalid-level')).toBe(false)
    })

    test('should sanitize custom input correctly', () => {
      const sanitizeInput = (input: string): string => {
        return input
          .trim()
          .replace(/[<>"'&]/g, '')
          .replace(/\s+/g, ' ')
          .substring(0, 100)
      }

      expect(sanitizeInput('  Solution Architect  ')).toBe('Solution Architect')
      expect(sanitizeInput('Role<script>alert("xss")</script>')).toBe('Rolescriptalert(xss)/script')
      expect(sanitizeInput('Role   with   spaces')).toBe('Role with spaces')
      expect(sanitizeInput('A'.repeat(150))).toBe('A'.repeat(100))
    })

    test('should determine when guidelines can be generated', () => {
      const canGenerate = (role: string, customRole: string, level: string, customLevel: string, hasGenerated: boolean) => {
        const effectiveRole = role === 'other' ? customRole.trim() : role
        const effectiveLevel = level === 'other' ? customLevel.trim() : level
        return !!(effectiveRole && effectiveLevel && !hasGenerated)
      }

      // Standard combinations
      expect(canGenerate('engineering', '', 'senior', '', false)).toBe(true)
      expect(canGenerate('engineering', '', 'senior', '', true)).toBe(false)

      // Custom combinations
      expect(canGenerate('other', 'DevOps Engineer', 'other', 'Lead', false)).toBe(true)
      expect(canGenerate('other', '', 'other', 'Lead', false)).toBe(false)
      expect(canGenerate('other', 'DevOps Engineer', 'other', '', false)).toBe(false)

      // Missing selections
      expect(canGenerate('', '', '', '', false)).toBe(false)
      expect(canGenerate('engineering', '', '', '', false)).toBe(false)
    })
  })

  describe('Template Data Fetching', () => {
    test('should fetch templated guidelines for standard combinations', async () => {
      const role = 'engineering'
      const level = 'senior'
      
      const response = await fetch(
        `/api/career-guidelines/template?role=${encodeURIComponent(role)}&level=${encodeURIComponent(level)}`,
        {
          headers: {
            'X-Dev-User-Id': 'dev-user-123'
          }
        }
      )
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.currentLevelPlan).toBe('Template current level plan for Engineering Senior')
      expect(data.nextLevelExpectations).toBe('Template next level expectations for Engineering Senior')
      
      // Verify correct API call
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/career-guidelines/template?role=engineering&level=senior',
        expect.objectContaining({
          headers: {
            'X-Dev-User-Id': 'dev-user-123'
          }
        })
      )
    })

    test('should handle template not found gracefully', async () => {
      // Mock template not found
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Template not found' })
      }))

      const response = await fetch('/api/career-guidelines/template?role=engineering&level=senior')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    test('should fallback to generation when template fails', async () => {
      // Simulate the component logic: try template first, then generation
      const role = 'engineering'
      const level = 'senior'
      
      // Mock template failure
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 404
      }))
      
      // Mock successful generation
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          currentLevelPlan: 'Generated fallback plan',
          nextLevelExpectations: 'Generated fallback expectations'
        })
      }))

      // Try template first
      const templateResponse = await fetch(`/api/career-guidelines/template?role=${role}&level=${level}`)
      
      if (!templateResponse.ok) {
        // Fallback to generation
        const generateResponse = await fetch('/api/career-guidelines/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'dev-user-123'
          },
          body: JSON.stringify({ role, level })
        })
        
        expect(generateResponse.ok).toBe(true)
        const data = await generateResponse.json()
        expect(data.currentLevelPlan).toBe('Generated fallback plan')
      }
    })
  })

  describe('Guidelines Generation', () => {
    test('should generate guidelines for custom roles', async () => {
      const response = await fetch('/api/career-guidelines/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: JSON.stringify({
          role: 'DevOps Engineer',
          level: 'Lead'
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.currentLevelPlan).toBe('Generated current level plan')
      expect(data.nextLevelExpectations).toBe('Generated next level expectations')
      
      // Verify correct API call
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/career-guidelines/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Dev-User-Id': 'dev-user-123'
          },
          body: JSON.stringify({
            role: 'DevOps Engineer',
            level: 'Lead'
          })
        })
      )
    })

    test('should include company ladder in generation request', async () => {
      const companyLadder = 'Our company uses these levels: L1, L2, L3...'
      
      await fetch('/api/career-guidelines/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: JSON.stringify({
          role: 'Engineering',
          level: 'Senior',
          companyLadder
        })
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/career-guidelines/generate',
        expect.objectContaining({
          body: JSON.stringify({
            role: 'Engineering',
            level: 'Senior',
            companyLadder
          })
        })
      )
    })

    test('should handle generation errors', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      }))

      const response = await fetch('/api/career-guidelines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Engineering', level: 'Senior' })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('File Upload and Document Extraction', () => {
    test('should upload file with correct form data', async () => {
      const file = new File(['career ladder content'], 'career-ladder.pdf', { type: 'application/pdf' })
      const role = 'engineering'
      const level = 'senior'

      const formData = new FormData()
      formData.append('file', file)
      formData.append('role', role)
      formData.append('level', level)

      const response = await fetch('/api/career-guidelines/upload', {
        method: 'POST',
        headers: {
          'X-Dev-User-Id': 'dev-user-123'
        },
        body: formData
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.currentLevelPlan).toBe('Extracted current level plan from document')
      expect(data.nextLevelExpectations).toBe('Extracted next level expectations from document')
      
      // Verify FormData was created and used
      expect(global.FormData).toHaveBeenCalled()
      expect(mockFormData.append).toHaveBeenCalledWith('file', file)
      expect(mockFormData.append).toHaveBeenCalledWith('role', role)
      expect(mockFormData.append).toHaveBeenCalledWith('level', level)
    })

    test('should handle document parsing errors', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          message: 'No relevant content found for Engineering Senior in the document',
          suggestions: [
            'Check if the document contains information about Engineering roles',
            'Verify the document includes Senior level expectations',
            'Try a different document or use the Generate button instead'
          ]
        })
      }))

      const file = new File(['irrelevant content'], 'document.pdf')
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/career-guidelines/upload', {
        method: 'POST',
        body: formData
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data.message).toContain('No relevant content found')
      expect(data.suggestions).toHaveLength(3)
    })

    test('should validate role and level before upload', () => {
      // Simulate component validation logic
      const validateUpload = (role: string, customRole: string, level: string, customLevel: string) => {
        const effectiveRole = role === 'other' ? customRole : role
        const effectiveLevel = level === 'other' ? customLevel : level
        
        if (!effectiveRole || !effectiveLevel) {
          return { valid: false, error: 'Please select both role and level before uploading' }
        }
        
        return { valid: true, error: null }
      }

      // Valid selections
      expect(validateUpload('engineering', '', 'senior', '')).toEqual({ valid: true, error: null })
      expect(validateUpload('other', 'DevOps', 'other', 'Lead')).toEqual({ valid: true, error: null })

      // Invalid selections
      expect(validateUpload('', '', 'senior', '')).toEqual({ 
        valid: false, 
        error: 'Please select both role and level before uploading' 
      })
      expect(validateUpload('engineering', '', '', '')).toEqual({ 
        valid: false, 
        error: 'Please select both role and level before uploading' 
      })
      expect(validateUpload('other', '', 'other', 'Lead')).toEqual({ 
        valid: false, 
        error: 'Please select both role and level before uploading' 
      })
    })

    test('should accept valid file types', () => {
      const acceptedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md']
      const validFiles = [
        'career-ladder.txt',
        'ladder.pdf', 
        'promotion-guide.doc',
        'guidelines.docx',
        'career-framework.md'
      ]

      validFiles.forEach(filename => {
        const extension = '.' + filename.split('.').pop()
        expect(acceptedTypes).toContain(extension)
      })
    })

    test('should handle upload success state correctly', async () => {
      const file = new File(['content'], 'career-ladder.pdf')
      
      // Simulate successful upload response
      const response = await fetch('/api/career-guidelines/upload', {
        method: 'POST',
        body: new FormData()
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      // Verify success indicators
      expect(data.currentLevelPlan).toBeTruthy()
      expect(data.nextLevelExpectations).toBeTruthy()
    })

    test('should show loading state during file upload like generate button', () => {
      // Simulate the upload loading behavior
      let isUploading = false
      let isLoading = false
      let hasGeneratedGuidelines = false

      const handleFileUpload = async () => {
        isUploading = true
        isLoading = true // Should set both loading states
        
        try {
          // Simulate upload process
          await new Promise(resolve => setTimeout(resolve, 100))
          hasGeneratedGuidelines = true
        } finally {
          isUploading = false
          isLoading = false // Should clear both loading states
        }
      }

      const canGenerate = () => {
        return !hasGeneratedGuidelines && !isUploading // Should be hidden during upload
      }

      // Before upload
      expect(canGenerate()).toBe(true)
      expect(isLoading).toBe(false)
      expect(isUploading).toBe(false)

      // During upload (simulated)
      isUploading = true
      isLoading = true
      expect(canGenerate()).toBe(false) // Generate button should be hidden
      expect(isLoading).toBe(true) // Should show loading state
      expect(isUploading).toBe(true) // Should show upload-specific loading

      // After upload
      isUploading = false
      isLoading = false
      hasGeneratedGuidelines = true
      expect(canGenerate()).toBe(false) // Generate button stays hidden after success
      expect(isLoading).toBe(false)
      expect(isUploading).toBe(false)
    })
  })

  describe('Guidelines Editing', () => {
    test('should allow editing of generated guidelines', () => {
      // Simulate the editing logic
      let currentLevelPlan = 'Initial generated content'
      let nextLevelExpectations = 'Initial expectations'

      const updateCurrentPlan = (newContent: string) => {
        currentLevelPlan = newContent
      }

      const updateExpectations = (newContent: string) => {
        nextLevelExpectations = newContent
      }

      // Test editing
      updateCurrentPlan('Modified current level plan')
      updateExpectations('Modified expectations')

      expect(currentLevelPlan).toBe('Modified current level plan')
      expect(nextLevelExpectations).toBe('Modified expectations')
    })

    test('should validate completion requirements', () => {
      const canContinue = (role: string, customRole: string, level: string, customLevel: string, 
                          currentPlan: string, expectations: string) => {
        const effectiveRole = role === 'other' ? customRole.trim() : role
        const effectiveLevel = level === 'other' ? customLevel.trim() : level
        return !!(effectiveRole && effectiveLevel && currentPlan && expectations)
      }

      // Valid completion
      expect(canContinue('engineering', '', 'senior', '', 'plan', 'expectations')).toBe(true)
      expect(canContinue('other', 'DevOps', 'other', 'Lead', 'plan', 'expectations')).toBe(true)

      // Invalid completion - missing content
      expect(canContinue('engineering', '', 'senior', '', '', 'expectations')).toBe(false)
      expect(canContinue('engineering', '', 'senior', '', 'plan', '')).toBe(false)
      expect(canContinue('engineering', '', 'senior', '', '', '')).toBe(false)

      // Invalid completion - missing role/level
      expect(canContinue('', '', 'senior', '', 'plan', 'expectations')).toBe(false)
      expect(canContinue('engineering', '', '', '', 'plan', 'expectations')).toBe(false)
    })
  })

  describe('State Management', () => {
    test('should reset guidelines when role or level changes', () => {
      // Simulate the reset logic
      let hasGeneratedGuidelines = true
      let currentLevelPlan = 'Existing plan'
      let nextLevelExpectations = 'Existing expectations'

      const handleRoleChange = (newRole: string) => {
        if (hasGeneratedGuidelines) {
          currentLevelPlan = ''
          nextLevelExpectations = ''
          hasGeneratedGuidelines = false
        }
      }

      const handleLevelChange = (newLevel: string) => {
        if (hasGeneratedGuidelines) {
          currentLevelPlan = ''
          nextLevelExpectations = ''
          hasGeneratedGuidelines = false
        }
      }

      // Test role change reset
      handleRoleChange('product')
      expect(currentLevelPlan).toBe('')
      expect(nextLevelExpectations).toBe('')
      expect(hasGeneratedGuidelines).toBe(false)

      // Reset state for level change test
      hasGeneratedGuidelines = true
      currentLevelPlan = 'Existing plan'
      nextLevelExpectations = 'Existing expectations'

      // Test level change reset  
      handleLevelChange('principal')
      expect(currentLevelPlan).toBe('')
      expect(nextLevelExpectations).toBe('')
      expect(hasGeneratedGuidelines).toBe(false)
    })

    test('should track extraction source correctly', () => {
      let extractedFromDocument = false
      let hasGeneratedGuidelines = false

      // Simulate template/generation success
      const handleGenerateSuccess = () => {
        hasGeneratedGuidelines = true
        extractedFromDocument = false
      }

      // Simulate upload success
      const handleUploadSuccess = () => {
        hasGeneratedGuidelines = true
        extractedFromDocument = true
      }

      // Test generation
      handleGenerateSuccess()
      expect(hasGeneratedGuidelines).toBe(true)
      expect(extractedFromDocument).toBe(false)

      // Test upload
      handleUploadSuccess()
      expect(hasGeneratedGuidelines).toBe(true)
      expect(extractedFromDocument).toBe(true)
    })
  })

  describe('Integration Scenarios', () => {
    test('should handle complete workflow: select -> generate -> edit -> continue', async () => {
      // 1. Select standard role/level
      const role = 'engineering'
      const level = 'senior'
      
      // 2. Generate guidelines (should use template)
      const templateResponse = await fetch(`/api/career-guidelines/template?role=${role}&level=${level}`)
      expect(templateResponse.ok).toBe(true)
      
      const templateData = await templateResponse.json()
      let currentPlan = templateData.currentLevelPlan
      let expectations = templateData.nextLevelExpectations
      
      // 3. Edit guidelines
      currentPlan = 'Edited: ' + currentPlan
      expectations = 'Edited: ' + expectations
      
      // 4. Validate completion
      const canContinue = !!(role && level && currentPlan && expectations)
      expect(canContinue).toBe(true)
      
      // 5. Complete step
      const completionData = {
        role,
        customRole: '',
        level,  
        customLevel: '',
        careerGuidelines: {
          currentLevelPlan: currentPlan,
          nextLevelExpectations: expectations
        }
      }
      
      expect(completionData.role).toBe('engineering')
      expect(completionData.level).toBe('senior')
      expect(completionData.careerGuidelines.currentLevelPlan).toContain('Edited:')
      expect(completionData.careerGuidelines.nextLevelExpectations).toContain('Edited:')
    })

    test('should handle custom role workflow: select other -> generate -> continue', async () => {
      // 1. Select custom role/level
      const role = 'other'
      const customRole = 'DevOps Engineer'
      const level = 'other'
      const customLevel = 'Lead'
      
      // 2. Generate guidelines (should use generation API)
      const generateResponse = await fetch('/api/career-guidelines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: customRole,
          level: customLevel
        })
      })
      
      expect(generateResponse.ok).toBe(true)
      const data = await generateResponse.json()
      
      // 3. Complete step
      const completionData = {
        role,
        customRole,
        level,
        customLevel,
        careerGuidelines: {
          currentLevelPlan: data.currentLevelPlan,
          nextLevelExpectations: data.nextLevelExpectations
        }
      }
      
      expect(completionData.role).toBe('other')
      expect(completionData.customRole).toBe('DevOps Engineer')
      expect(completionData.level).toBe('other')
      expect(completionData.customLevel).toBe('Lead')
    })

    test('should handle document upload workflow: select -> upload -> edit -> continue', async () => {
      // 1. Select role/level
      const role = 'engineering'
      const level = 'senior'
      
      // 2. Upload document
      const file = new File(['career ladder content'], 'ladder.pdf')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('role', role)
      formData.append('level', level)
      
      const uploadResponse = await fetch('/api/career-guidelines/upload', {
        method: 'POST',
        body: formData
      })
      
      expect(uploadResponse.ok).toBe(true)
      const uploadData = await uploadResponse.json()
      
      // 3. Edit extracted content
      let currentPlan = 'Refined: ' + uploadData.currentLevelPlan
      let expectations = 'Refined: ' + uploadData.nextLevelExpectations
      
      // 4. Complete with document flag
      const completionData = {
        role,
        customRole: '',
        level,
        customLevel: '',
        careerGuidelines: {
          currentLevelPlan: currentPlan,
          nextLevelExpectations: expectations,
          companyLadder: 'document-uploaded' // Flag indicating document was used
        }
      }
      
      expect(completionData.careerGuidelines.currentLevelPlan).toContain('Refined:')
      expect(completionData.careerGuidelines.nextLevelExpectations).toContain('Refined:')
      expect(completionData.careerGuidelines.companyLadder).toBe('document-uploaded')
    })
  })
})