/**
 * Unified Data Seeding Service
 * 
 * Single reusable service for initializing development and staging environments
 * with mock data. Eliminates code duplication and ensures consistency.
 */

import { PrismaClient } from '@prisma/client'
import { BASE_MOCK_USERS } from './mock-users'
import { seedCareerGuidelineTemplates } from './career-guidelines-seeding'
import { RichDataSeedingService } from './rich-data-seeding-service'
import { RichIntegrationDataService } from './rich-integration-data-service'

export interface SeedingConfig {
  environment: 'development' | 'staging'
  userIdPrefix?: string  // 'staging_' for staging, '' for development
  emailSuffix?: string   // '+staging@' for staging, '+dev@' for development
}

/**
 * Initialize database with mock data for development or staging
 */
export async function initializeMockData(
  config: SeedingConfig,
  prisma?: PrismaClient
): Promise<void> {
  const db = prisma || new PrismaClient()
  const shouldDisconnect = !prisma // Only disconnect if we created the client
  
  const envName = config.environment === 'staging' ? 'staging' : 'development'
  const envEmoji = config.environment === 'staging' ? '🚀' : '🐘'
  
  console.log(`${envEmoji} Initializing ${envName} database with mock data...\n`)

  try {
    // 1. Clean up existing data
    console.log('1️⃣ Cleaning up existing data...')
    const userIds = config.userIdPrefix
      ? { startsWith: config.userIdPrefix }
      : { in: BASE_MOCK_USERS.map((_, index) => `${index + 1}`) } // Development user IDs

    await db.weeklySnippet.deleteMany({
      where: { userId: userIds }
    })
    
    // Try to clean up integrationData if the table exists
    try {
      await db.integrationData.deleteMany({
        where: { userId: userIds }
      })
    } catch (error) {
      console.log('⚠️  IntegrationData table not found - skipping cleanup (this is normal for new deployments)')
    }
    
    await db.integration.deleteMany({
      where: { userId: userIds }
    })
    await db.user.deleteMany({
      where: { id: userIds }
    })
    console.log(`✅ Existing ${envName} data cleaned up\n`)

    // 2. Create mock users
    console.log('2️⃣ Creating mock users...')
    const mockUsers = BASE_MOCK_USERS.map((user, index) => ({
      ...user,
      id: config.userIdPrefix ? `${config.userIdPrefix}${index + 1}` : `${index + 1}`,
      email: config.emailSuffix 
        ? user.email.replace('@', config.emailSuffix) 
        : user.email
    }))
    
    for (const mockUser of mockUsers) {
      const jobTitle = mockUser.role.split(' - ')[0] || mockUser.role
      const seniorityLevel = mockUser.role.includes('Senior') ? 'Senior' : 
                             mockUser.role.includes('Staff') ? 'Staff' : 'Mid-level'
      const onboardingCompletedAt = new Date()
      
      const userData = {
        name: mockUser.name,
        jobTitle,
        seniorityLevel,
        onboardingCompletedAt
      }
      
      const user = await db.user.upsert({
        where: { email: mockUser.email },
        update: userData,
        create: {
          id: mockUser.id,
          email: mockUser.email,
          image: mockUser.image,
          ...userData
        }
      })
      console.log(`✅ Created ${envName} user: ${user.name} (${user.email})`)
    }
    console.log()

    // 3. Add career guidelines for Jack (first user)
    console.log(`3️⃣ Setting up career guidelines for ${mockUsers[0].name}...`)
    const firstUser = await db.user.findUnique({
      where: { id: mockUsers[0].id }
    })
    
    if (firstUser) {
      const envTag = config.environment === 'staging' ? '[STAGING]' : '[DEV]'
      await db.user.update({
        where: { id: firstUser.id },
        data: {
          careerProgressionPlan: `As a Senior Software Engineer (${config.environment}):
- Lead technical design and implementation of complex features
- Mentor junior developers and conduct code reviews
- Identify and resolve architectural issues
- Collaborate with cross-functional teams
- Drive best practices and technical standards
- ${envTag} This is mock career guidance for ${envName}`,
          nextLevelExpectations: `To reach Staff Engineer level (${config.environment}):
- Demonstrate technical leadership across multiple teams
- Drive architectural decisions at the platform level
- Influence engineering culture and practices
- Lead critical, high-impact projects
- Build deep expertise in key technical domains
- ${envTag} This is mock next level guidance for ${envName}`,
          companyCareerLadder: `Internal engineering career ladder document (${envName} mock)`,
          careerPlanGeneratedAt: new Date()
        }
      })
      console.log(`✅ Career guidelines updated for ${firstUser.name}\n`)
    }

    // 4. Create mock integrations
    console.log(`4️⃣ Setting up mock integrations for ${envName} users...`)
    
    for (const mockUser of mockUsers) {
      // Google Calendar integration for all users
      await db.integration.upsert({
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
          accessToken: `${envName}-mock-token`,
          refreshToken: null,
          expiresAt: null,
          metadata: {
            status: `${envName}_mock`,
            note: `${envName} mock integration for ${mockUser.name}`,
            mockData: true
          },
          isActive: true,
          lastSyncAt: new Date()
        }
      })
      console.log(`✅ Created Google Calendar integration for ${mockUser.name}`)
      
      // Todoist for Jack (first user only)
      if (mockUser.id === mockUsers[0].id) {
        await db.integration.upsert({
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
            accessToken: `${envName}-mock-todoist-token`,
            refreshToken: null,
            expiresAt: null,
            metadata: {
              status: `${envName}_mock`,
              note: `${envName} mock Todoist integration for ${mockUser.name}`,
              mockData: true
            },
            isActive: true,
            lastSyncAt: new Date()
          }
        })
        console.log(`✅ Created Todoist integration for ${mockUser.name}`)
      }
    }
    console.log()

    // 5. Seed career guideline templates (needed for all environments)
    console.log('5️⃣ Seeding career guideline templates...')
    try {
      const result = await seedCareerGuidelineTemplates(db, false)
      console.log(`✅ Career guideline templates seeded (${result.created} created, ${result.skipped} skipped)\n`)
    } catch (error) {
      console.error('⚠️  Failed to seed career guideline templates:', error instanceof Error ? error.message : String(error))
      console.log('Career guideline templates may need to be seeded manually\n')
    }

    // 6. Seed rich integration data for users with available datasets
    console.log('6️⃣ Seeding rich integration data...')
    try {
      // Find users with available rich data
      const usersWithRichData = mockUsers.filter(user => 
        RichIntegrationDataService.hasRichDataForUser(user.id)
      )
      
      if (usersWithRichData.length > 0) {
        await RichDataSeedingService.seedRichDataForUsers(
          usersWithRichData.map(user => user.id),
          config.environment,
          db
        )
        console.log(`✅ Rich integration data seeded for ${usersWithRichData.length} users\n`)
      } else {
        console.log('💡 No users found with available rich datasets\n')
      }
    } catch (error) {
      console.error('⚠️  Failed to seed rich integration data:', error instanceof Error ? error.message : String(error))
      console.log('💡 This is expected if the IntegrationData table doesn\'t exist yet.')
      console.log('   Run database migration first: npx prisma db push\n')
    }

    console.log(`🎉 ${envName} database initialized successfully!`)
    console.log('📊 Summary:')
    console.log(`   - ${mockUsers.length} ${envName} users created`)
    console.log('   - Mock integrations (Google Calendar, Todoist) configured')
    console.log(`   - Career guidelines populated for ${mockUsers[0].name}`)
    console.log('   - Career guideline templates seeded globally')
    console.log('   - Rich integration data seeded for users with available datasets')
    console.log()
    
    const accessUrl = config.environment === 'staging' 
      ? 'https://advanceweekly.io/staging' 
      : 'http://localhost:3000'
    
    console.log(`🚀 ${envName} environment is ready! You can now:`)
    console.log(`   - Access app at ${accessUrl}`)
    console.log(`   - Test mock authentication with ${envName} users`)
    console.log('   - Create and edit reflections manually')
    console.log('   - Generate reflections using rich calendar data (Jack users)')
    console.log(`   - Use same data patterns across environments`)
    
  } catch (error) {
    console.error(`❌ Error initializing ${envName} data:`, error)
    throw error
  } finally {
    if (shouldDisconnect) {
      await db.$disconnect()
    }
  }
}