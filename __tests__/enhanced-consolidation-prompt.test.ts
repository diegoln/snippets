/**
 * Enhanced Consolidation Prompt Tests
 * 
 * Tests for the calendar consolidation prompt with rich data support
 */

import { buildCalendarConsolidationPrompt } from '../lib/consolidation-prompts/calendar-consolidation-prompt'

describe('Enhanced Calendar Consolidation Prompt', () => {
  const baseContext = {
    userName: 'Jack Thompson',
    userRole: 'Senior Software Engineer',
    userLevel: 'Senior',
    careerGuidelines: 'Focus on technical leadership and mentoring',
    calendarEvents: [
      {
        id: 'cal_001',
        summary: 'Daily Standup - Identity Platform Team',
        description: 'Team standup discussion',
        start: { dateTime: '2024-10-01T09:00:00-07:00' },
        end: { dateTime: '2024-10-01T09:15:00-07:00' },
        attendees: [
          { email: 'jack@company.com', displayName: 'Jack Thompson', self: true },
          { email: 'sarah@company.com', displayName: 'Sarah Chen' }
        ],
        status: 'confirmed'
      }
    ],
    meetingNotes: ['Discussed JWT implementation progress']
  }

  test('includes basic context without rich data', () => {
    const prompt = buildCalendarConsolidationPrompt(baseContext)

    expect(prompt).toContain('userName**: Jack Thompson')
    expect(prompt).toContain('userRole**: Senior Software Engineer')
    expect(prompt).toContain('careerGuidelines**: Focus on technical leadership')
    expect(prompt).toContain('Daily Standup - Identity Platform Team')
    expect(prompt).toContain('Discussed JWT implementation progress')
  })

  test('includes conversation excerpts when provided', () => {
    const contextWithTranscripts = {
      ...baseContext,
      conversationExcerpts: [
        {
          meetingType: '1:1 Meeting',
          participants: ['Jack Thompson', 'Sarah Chen'],
          keyExcerpts: [
            'I think the JWT refresh token rotation is the most complex part',
            'Sarah mentioned that Mike has experience with JWT implementations'
          ],
          duration: '27 minutes'
        }
      ]
    }

    const prompt = buildCalendarConsolidationPrompt(contextWithTranscripts)

    expect(prompt).toContain('conversationExcerpts')
    expect(prompt).toContain('1:1 Meeting (27 minutes)')
    expect(prompt).toContain('**Participants**: Jack Thompson, Sarah Chen')
    expect(prompt).toContain('JWT refresh token rotation')
    expect(prompt).toContain('Mike has experience with JWT')
  })

  test('includes meeting documents when provided', () => {
    const contextWithDocs = {
      ...baseContext,
      meetingDocs: [
        {
          kind: 'docs#document',
          documentId: 'test-doc-id',
          title: 'Meeting Notes - 1:1 Sarah & Jack - Oct 1, 2024',
          body: {
            content: [
              {
                startIndex: 1,
                endIndex: 12,
                paragraph: {
                  elements: [
                    {
                      startIndex: 1,
                      endIndex: 11,
                      textRun: {
                        content: 'Action Items:\n'
                      }
                    }
                  ]
                }
              },
              {
                startIndex: 12,
                endIndex: 50,
                paragraph: {
                  elements: [
                    {
                      startIndex: 12,
                      endIndex: 49,
                      textRun: {
                        content: 'Jack will implement JWT refresh logic'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }

    const prompt = buildCalendarConsolidationPrompt(contextWithDocs)

    expect(prompt).toContain('meetingDocs')
    expect(prompt).toContain('Meeting Notes - 1:1 Sarah & Jack - Oct 1, 2024')
    expect(prompt).toContain('Action Items:')
    expect(prompt).toContain('Jack will implement JWT refresh logic')
  })

  test('includes both conversation excerpts and meeting docs with correct numbering', () => {
    const contextWithBoth = {
      ...baseContext,
      conversationExcerpts: [
        {
          meetingType: '1:1 Meeting',
          participants: ['Jack Thompson', 'Sarah Chen'],
          keyExcerpts: ['Discussed technical approach'],
          duration: '30 minutes'
        }
      ],
      meetingDocs: [
        {
          kind: 'docs#document',
          documentId: 'test-doc-id',
          title: 'Meeting Notes',
          body: {
            content: [
              {
                startIndex: 1,
                endIndex: 10,
                paragraph: {
                  elements: [
                    {
                      startIndex: 1,
                      endIndex: 9,
                      textRun: {
                        content: 'Test note'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }

    const prompt = buildCalendarConsolidationPrompt(contextWithBoth)

    // Should have both sections with correct numbering
    expect(prompt).toContain('7. **conversationExcerpts**')
    expect(prompt).toContain('8. **meetingDocs**')
    expect(prompt).toContain('1:1 Meeting (30 minutes)')
    expect(prompt).toContain('Meeting Notes')
  })

  test('enhances core instructions for rich data processing', () => {
    const prompt = buildCalendarConsolidationPrompt(baseContext)

    expect(prompt).toContain('conversation excerpts, and meeting documents')
    expect(prompt).toContain('Direct quotes and statements from conversation excerpts')
    expect(prompt).toContain('Technical discussions and problem-solving shown in transcripts')
    expect(prompt).toContain('incorporate specific quotes or technical details')
  })

  test('handles empty rich data arrays gracefully', () => {
    const contextWithEmptyArrays = {
      ...baseContext,
      conversationExcerpts: [],
      meetingDocs: [],
      meetingTranscripts: []
    }

    const prompt = buildCalendarConsolidationPrompt(contextWithEmptyArrays)

    // Should not include empty sections
    expect(prompt).not.toContain('conversationExcerpts')
    expect(prompt).not.toContain('meetingDocs')
    expect(prompt).toContain('userName**: Jack Thompson') // Basic content still present
  })

  test('extracts document text correctly from complex Google Docs structure', () => {
    const contextWithComplexDoc = {
      ...baseContext,
      meetingDocs: [
        {
          kind: 'docs#document',
          documentId: 'complex-doc',
          title: 'Complex Meeting Notes',
          body: {
            content: [
              {
                startIndex: 1,
                endIndex: 20,
                paragraph: {
                  elements: [
                    {
                      startIndex: 1,
                      endIndex: 19,
                      textRun: {
                        content: 'Meeting Agenda:\n'
                      }
                    }
                  ]
                }
              },
              {
                startIndex: 20,
                endIndex: 50,
                paragraph: {
                  elements: [
                    {
                      startIndex: 20,
                      endIndex: 30,
                      textRun: {
                        content: '1. Review '
                      }
                    },
                    {
                      startIndex: 30,
                      endIndex: 49,
                      textRun: {
                        content: 'JWT implementation\n'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }

    const prompt = buildCalendarConsolidationPrompt(contextWithComplexDoc)

    expect(prompt).toContain('Meeting Agenda:')
    expect(prompt).toContain('1. Review JWT implementation')
  })
})