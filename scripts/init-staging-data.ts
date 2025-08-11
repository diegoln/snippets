#!/usr/bin/env npx tsx

/**
 * Initialize staging database with mock data
 * This script populates staging environment with realistic mock data:
 * - Staging users with proper ID prefixes
 * - Mock integration data stored in database
 * - Career guidelines and onboarding data
 * - Empty reflection slots for LLM generation
 */

import { PrismaClient } from '@prisma/client'
import { getCurrentWeekNumber } from '../lib/week-utils'
import { getWeekDates } from '../lib/utils'
import { getMockUsers } from '../lib/mock-users'

const prisma = new PrismaClient()

async function initializeStagingData() {
  console.log('🚀 Initializing staging database with mock data...\n')

  try {
    // 1. Clean up existing staging data
    console.log('1️⃣ Cleaning up existing staging data...')
    await prisma.weeklySnippet.deleteMany({
      where: { userId: { startsWith: 'staging_' } }
    })
    await prisma.integration.deleteMany({
      where: { userId: { startsWith: 'staging_' } }
    })
    await prisma.user.deleteMany({
      where: { id: { startsWith: 'staging_' } }
    })
    console.log('✅ Existing staging data cleaned up\n')

    // 2. Create staging mock users
    console.log('2️⃣ Creating staging mock users...')
    const mockUsers = getMockUsers() // This will return staging users when in staging context
    
    for (const mockUser of mockUsers) {
      if (!mockUser.id.startsWith('staging_')) {
        console.log(`⚠️ Skipping non-staging user: ${mockUser.id}`)
        continue
      }
      
      const user = await prisma.user.upsert({
        where: { email: mockUser.email },
        update: {
          name: mockUser.name,
          jobTitle: mockUser.role.split(' - ')[0] || mockUser.role,
          seniorityLevel: mockUser.role.includes('Senior') ? 'Senior' : 
                          mockUser.role.includes('Staff') ? 'Staff' : 'Mid-level',
          onboardingCompletedAt: new Date()
        },
        create: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          image: mockUser.image,
          jobTitle: mockUser.role.split(' - ')[0] || mockUser.role,
          seniorityLevel: mockUser.role.includes('Senior') ? 'Senior' : 
                          mockUser.role.includes('Staff') ? 'Staff' : 'Mid-level',
          onboardingCompletedAt: new Date()
        }
      })
      console.log(`✅ Created staging user: ${user.name} (${user.email})`)
    }
    console.log()

    // 3. Add career guidelines for Jack (staging_1)
    console.log('3️⃣ Setting up career guidelines for staging Jack...')
    const stagingJack = await prisma.user.findUnique({
      where: { id: 'staging_1' }
    })
    
    if (stagingJack) {
      await prisma.user.update({
        where: { id: stagingJack.id },
        data: {
          careerProgressionPlan: `As a Senior Software Engineer (Staging):
- Lead technical design and implementation of complex features
- Mentor junior developers and conduct code reviews
- Identify and resolve architectural issues
- Collaborate with cross-functional teams
- Drive best practices and technical standards
- [STAGING] This is mock career guidance for testing`,
          nextLevelExpectations: `To reach Staff Engineer level (Staging):
- Demonstrate technical leadership across multiple teams
- Drive architectural decisions at the platform level
- Influence engineering culture and practices
- Lead critical, high-impact projects
- Build deep expertise in key technical domains
- [STAGING] This is mock next level guidance for testing`,
          companyCareerLadder: 'Internal engineering career ladder document (staging mock)',
          careerPlanGeneratedAt: new Date()
        }
      })
      console.log('✅ Career guidelines updated for staging Jack\n')
    }

    // 4. Create mock integrations for all staging users
    console.log('4️⃣ Setting up mock integrations for staging users...')
    
    for (const mockUser of mockUsers) {
      if (!mockUser.id.startsWith('staging_')) continue
      
      // Google Calendar integration
      const calendarIntegration = await prisma.integration.upsert({
        where: {
          userId_type: {
            userId: mockUser.id,
            type: 'google_calendar'
          }
        },
        update: {
          isActive: true,
          lastSyncAt: new Date()
        },
        create: {
          userId: mockUser.id,
          type: 'google_calendar',
          accessToken: 'staging-mock-token',
          refreshToken: null,
          expiresAt: null,
          metadata: JSON.stringify({
            status: 'staging_mock',
            note: `Staging mock integration for ${mockUser.name}`,
            mockData: true
          }),
          isActive: true,
          lastSyncAt: new Date()
        }
      })
      console.log(`✅ Created Google Calendar integration for ${mockUser.name}`)
      
      // Optionally add Todoist for Jack
      if (mockUser.id === 'staging_1') {
        await prisma.integration.upsert({
          where: {
            userId_type: {
              userId: mockUser.id,
              type: 'todoist'
            }
          },
          update: {
            isActive: true,
            lastSyncAt: new Date()
          },
          create: {
            userId: mockUser.id,
            type: 'todoist',
            accessToken: 'staging-mock-todoist-token',
            refreshToken: null,
            expiresAt: null,
            metadata: JSON.stringify({
              status: 'staging_mock',
              note: `Staging mock Todoist integration for ${mockUser.name}`,
              mockData: true
            }),
            isActive: true,
            lastSyncAt: new Date()
          }
        })
        console.log(`✅ Created Todoist integration for ${mockUser.name}`)
      }
    }
    console.log()

    // 5. Create weekly reflection entries for the past few weeks
    console.log('5️⃣ Creating weekly reflection entries...')
    const currentWeek = getCurrentWeekNumber()
    const currentYear = new Date().getFullYear()
    const weekNumbers = [currentWeek - 3, currentWeek - 2, currentWeek - 1, currentWeek]

    for (const mockUser of mockUsers) {
      if (!mockUser.id.startsWith('staging_')) continue
      
      for (const weekNumber of weekNumbers) {
        const { startDate, endDate } = getWeekDates(weekNumber, currentYear)
        
        await prisma.weeklySnippet.upsert({
          where: {
            userId_year_weekNumber: {
              userId: mockUser.id,
              year: currentYear,
              weekNumber: weekNumber
            }
          },
          update: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            // Keep existing content if any
          },
          create: {
            userId: mockUser.id,
            weekNumber: weekNumber,
            year: currentYear,
            content: '', // Empty - will be populated by LLM from mock calendar data
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          }
        })
      }
      console.log(`✅ Created ${weekNumbers.length} reflection entries for ${mockUser.name}`)
    }
    console.log()

    console.log('🎉 Staging database initialized successfully!')
    console.log('📊 Summary:')
    console.log(`   - ${mockUsers.filter(u => u.id.startsWith('staging_')).length} staging users created`)
    console.log('   - Mock integrations (Google Calendar, Todoist) configured')
    console.log('   - Weekly reflection slots created for past 4 weeks')
    console.log('   - Career guidelines populated for staging Jack')
    console.log()
    console.log('🚀 Staging environment is ready! You can now:')
    console.log('   - Access staging at https://advanceweekly.io/staging')
    console.log('   - Test mock authentication with staging users')
    console.log('   - Generate reflections from mock integration data')
    console.log('   - Reset staging data anytime by running this script')
    
  } catch (error) {
    console.error('❌ Error initializing staging data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  // Set environment context for staging data generation
  process.env.STAGING_CONTEXT = 'true'
  initializeStagingData()
}

export { initializeStagingData }