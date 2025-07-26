/**
 * Mock Google Calendar data for development and testing
 * 
 * Provides realistic calendar events that represent common meeting patterns
 * for software engineers, including 1:1s, team meetings, and planning sessions.
 */

import { CalendarEvent } from '../base/types'
import { addDays, addHours, setHours, format } from 'date-fns'

/**
 * Generate mock calendar events for a given week
 * Creates realistic meeting patterns based on the week start date
 */
export function generateMockCalendarEvents(weekStart: Date): CalendarEvent[] {
  const events: CalendarEvent[] = []
  
  // Monday - Sprint Planning & Team Standup
  const monday = weekStart
  events.push(
    createEvent(
      'sprint-planning-' + format(monday, 'yyyy-MM-dd'),
      'Sprint Planning',
      'Planning session for the upcoming sprint. Review user stories, estimate effort, and assign tasks.',
      setHours(monday, 9),
      setHours(monday, 11),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer' },
        { email: 'alex@company.com', displayName: 'Alex Designer' },
        { email: 'manager@company.com', displayName: 'Team Manager', organizer: true }
      ]
    ),
    createEvent(
      'standup-' + format(monday, 'yyyy-MM-dd'),
      'Daily Standup',
      'Daily team sync - what did you do yesterday, what will you do today, any blockers?',
      setHours(monday, 15),
      setHours(monday, 15, 30),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer' },
        { email: 'alex@company.com', displayName: 'Alex Designer' },
        { email: 'lead@company.com', displayName: 'Tech Lead', organizer: true }
      ]
    )
  )

  // Tuesday - 1:1 with Manager & Code Review
  const tuesday = addDays(weekStart, 1)
  events.push(
    createEvent(
      'one-on-one-' + format(tuesday, 'yyyy-MM-dd'),
      '1:1 with Manager',
      'Weekly check-in: career development, feedback, project progress, and any concerns.',
      setHours(tuesday, 14),
      setHours(tuesday, 14, 30),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'manager@company.com', displayName: 'Team Manager', organizer: true }
      ]
    ),
    createEvent(
      'code-review-' + format(tuesday, 'yyyy-MM-dd'),
      'Code Review Session',
      'Review PRs for the authentication refactor. Focus on security and maintainability.',
      setHours(tuesday, 16),
      setHours(tuesday, 17),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'senior@company.com', displayName: 'Senior Engineer', organizer: true },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer' }
      ]
    )
  )

  // Wednesday - Architecture Discussion & Client Demo
  const wednesday = addDays(weekStart, 2)
  events.push(
    createEvent(
      'architecture-review-' + format(wednesday, 'yyyy-MM-dd'),
      'Architecture Review: Integration System',
      'Design review for the new third-party integration system. Discuss scalability, security, and implementation approach.',
      setHours(wednesday, 10),
      setHours(wednesday, 11, 30),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'architect@company.com', displayName: 'Staff Engineer', organizer: true },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer' },
        { email: 'lead@company.com', displayName: 'Tech Lead' }
      ]
    ),
    createEvent(
      'client-demo-' + format(wednesday, 'yyyy-MM-dd'),
      'Client Demo - Q4 Features',
      'Showcase the performance assessment features to key stakeholders. Prepare for questions about ROI and user adoption.',
      setHours(wednesday, 15),
      setHours(wednesday, 16),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'pm@company.com', displayName: 'Product Manager', organizer: true },
        { email: 'client@external.com', displayName: 'Client Stakeholder' },
        { email: 'ceo@company.com', displayName: 'CEO' }
      ]
    )
  )

  // Thursday - Team Retrospective & Knowledge Sharing
  const thursday = addDays(weekStart, 3)
  events.push(
    createEvent(
      'retrospective-' + format(thursday, 'yyyy-MM-dd'),
      'Sprint Retrospective',
      'What went well, what could be improved, and action items for next sprint.',
      setHours(thursday, 13),
      setHours(thursday, 14),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer' },
        { email: 'alex@company.com', displayName: 'Alex Designer' },
        { email: 'scrum-master@company.com', displayName: 'Scrum Master', organizer: true }
      ]
    ),
    createEvent(
      'tech-talk-' + format(thursday, 'yyyy-MM-dd'),
      'Tech Talk: Modern API Design',
      'Internal knowledge sharing session on RESTful API best practices and GraphQL considerations.',
      setHours(thursday, 16),
      setHours(thursday, 17),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer', organizer: true },
        { email: 'backend@company.com', displayName: 'Backend Team' },
        { email: 'architect@company.com', displayName: 'Staff Engineer' }
      ]
    )
  )

  // Friday - All Hands & Team Social
  const friday = addDays(weekStart, 4)
  events.push(
    createEvent(
      'all-hands-' + format(friday, 'yyyy-MM-dd'),
      'All Hands Meeting',
      'Company-wide updates: Q4 results, upcoming initiatives, and team recognitions.',
      setHours(friday, 11),
      setHours(friday, 12),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'ceo@company.com', displayName: 'CEO', organizer: true },
        { email: 'all@company.com', displayName: 'All Company' }
      ]
    ),
    createEvent(
      'team-coffee-' + format(friday, 'yyyy-MM-dd'),
      'Team Coffee Chat',
      'Informal team bonding time. Optional but encouraged!',
      setHours(friday, 16),
      setHours(friday, 17),
      [
        { email: 'john@company.com', displayName: 'John Developer' },
        { email: 'sarah@company.com', displayName: 'Sarah Engineer' },
        { email: 'alex@company.com', displayName: 'Alex Designer' },
        { email: 'team@company.com', displayName: 'Engineering Team', organizer: true }
      ]
    )
  )

  return events
}

/**
 * Helper function to create a calendar event
 */
function createEvent(
  id: string,
  summary: string,
  description: string,
  start: Date,
  end: Date,
  attendees: Array<{email: string, displayName: string, organizer?: boolean}>
): CalendarEvent {
  const organizer = attendees.find(a => a.organizer) || attendees[0]
  
  return {
    id,
    summary,
    description,
    start: {
      dateTime: start.toISOString(),
      timeZone: 'America/Los_Angeles'
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'America/Los_Angeles'
    },
    attendees: attendees.map(a => ({
      email: a.email,
      displayName: a.displayName,
      organizer: a.organizer || false,
      self: a.email === 'john@company.com' // Assume current user
    })),
    organizer: {
      email: organizer.email,
      displayName: organizer.displayName
    },
    status: 'confirmed'
  }
}