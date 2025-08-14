#!/usr/bin/env node

/**
 * Staging Environment Initialization Script
 * 
 * Uses the unified data-seeding-service for consistency across environments.
 * Creates staging-specific mock users and data patterns.
 * 
 * Usage: NODE_ENV=production DATABASE_URL=<prod_db_url> node init-staging-environment.js
 */

const { PrismaClient } = require('@prisma/client');

// Base mock user data (copied from lib/mock-users.ts)
const BASE_MOCK_USERS = [
  {
    name: 'Jack Thompson',
    email: 'jack@company.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Software Engineer - Identity Platform'
  },
  {
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    role: 'Staff Engineer'
  },
  {
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    role: 'Senior Product Designer'
  }
];

async function initStagingEnvironment() {
  console.log('🎭 Initializing staging environment...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error']
  });

  try {
    console.log('🧪 Staging mock data initialization...\n');

    // 1. Clean up existing staging data
    console.log('1️⃣ Cleaning up existing staging data...');
    
    await prisma.weeklySnippet.deleteMany({
      where: { userId: { startsWith: 'staging_' } }
    });
    await prisma.integration.deleteMany({
      where: { userId: { startsWith: 'staging_' } }
    });
    await prisma.user.deleteMany({
      where: { id: { startsWith: 'staging_' } }
    });
    console.log('✅ Existing staging data cleaned up\n');

    // 2. Create staging mock users
    console.log('2️⃣ Creating staging mock users...');
    const stagingUsers = BASE_MOCK_USERS.map((user, index) => ({
      ...user,
      id: `staging_${index + 1}`,
      email: user.email.replace('@', '+staging@')
    }));
    
    for (const mockUser of stagingUsers) {
      const jobTitle = mockUser.role.split(' - ')[0] || mockUser.role;
      const seniorityLevel = mockUser.role.includes('Senior') ? 'Senior' : 
                             mockUser.role.includes('Staff') ? 'Staff' : 'Mid-level';
      const onboardingCompletedAt = new Date();
      
      const userData = {
        name: mockUser.name,
        jobTitle,
        seniorityLevel,
        onboardingCompletedAt
      };
      
      const user = await prisma.user.upsert({
        where: { email: mockUser.email },
        update: userData,
        create: {
          id: mockUser.id,
          email: mockUser.email,
          image: mockUser.image,
          ...userData
        }
      });
      console.log(`✅ Created staging user: ${user.name} (${user.email})`);
    }
    console.log();

    // 3. Add staging integrations
    console.log('3️⃣ Setting up staging mock integrations...');
    
    for (const mockUser of stagingUsers) {
      // Google Calendar integration for all users
      await prisma.integration.upsert({
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
          metadata: {
            status: 'staging_mock',
            note: `Staging mock integration for ${mockUser.name}`,
            mockData: true
          },
          isActive: true,
          lastSyncAt: new Date()
        }
      });
      console.log(`✅ Created Google Calendar integration for ${mockUser.name}`);
      
      // Todoist for Jack (first user only)
      if (mockUser.id === stagingUsers[0].id) {
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
            metadata: {
              status: 'staging_mock',
              note: `Staging mock Todoist integration for ${mockUser.name}`,
              mockData: true
            },
            isActive: true,
            lastSyncAt: new Date()
          }
        });
        console.log(`✅ Created Todoist integration for ${mockUser.name}`);
      }
    }
    console.log();

    console.log('🎉 Staging environment initialization completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${stagingUsers.length} staging users created`);
    console.log('   - Mock integrations (Google Calendar, Todoist) configured');
    console.log('   - Ready for staging testing at: https://staging.advanceweekly.io');
    
  } catch (error) {
    console.error('❌ Staging initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  initStagingEnvironment().catch((error) => {
    console.error('Staging initialization failed:', error);
    process.exit(1);
  });
}

module.exports = { initStagingEnvironment };