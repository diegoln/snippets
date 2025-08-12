#!/usr/bin/env node

/**
 * Staging Environment Initialization Script
 * 
 * This script ensures staging has a consistent, predictable initial state:
 * - Creates staging mock users with proper IDs (staging_1, staging_2, etc.)
 * - Sets up initial data and configurations for staging environment  
 * - Can be run idempotently - safe to run multiple times
 * 
 * Usage: NODE_ENV=production DATABASE_URL=<prod_db_url> node init-staging-environment.js
 */

const { PrismaClient } = require('@prisma/client');

const STAGING_MOCK_USERS = [
  {
    id: 'staging_1',
    name: 'Jack Thompson',
    email: 'jack+staging@company.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    jobTitle: 'Senior Software Engineer',
    seniorityLevel: 'Senior'
  },
  {
    id: 'staging_2', 
    name: 'Sarah Engineer',
    email: 'sarah+staging@example.com',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    jobTitle: 'Staff Engineer',
    seniorityLevel: 'Staff'
  },
  {
    id: 'staging_3',
    name: 'Alex Designer',
    email: 'alex+staging@example.com',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 
    jobTitle: 'Senior Product Designer',
    seniorityLevel: 'Senior'
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
    console.log('📊 Connected to database');
    
    // 1. Create/update staging users
    console.log('👥 Creating staging users...');
    for (const user of STAGING_MOCK_USERS) {
      const result = await prisma.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          jobTitle: user.jobTitle,
          seniorityLevel: user.seniorityLevel,
          onboardingCompletedAt: new Date(), // Mark as onboarded for staging
        },
        update: {
          name: user.name,
          email: user.email,
          image: user.image,
          jobTitle: user.jobTitle,
          seniorityLevel: user.seniorityLevel,
          onboardingCompletedAt: new Date(),
        }
      });
      
      console.log(`✅ ${result.id}: ${result.name} (${result.email})`);
    }
    
    // 2. Create sample data for staging users
    console.log('📝 Creating sample snippets...');
    for (const user of STAGING_MOCK_USERS) {
      // Create a sample weekly snippet for demonstration
      const currentDate = new Date();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4); // Friday
      
      const weekNumber = Math.ceil(((currentDate - new Date(currentDate.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
      
      await prisma.weeklySnippet.upsert({
        where: {
          userId_year_weekNumber: {
            userId: user.id,
            year: currentDate.getFullYear(),
            weekNumber: weekNumber
          }
        },
        create: {
          userId: user.id,
          weekNumber: weekNumber,
          year: currentDate.getFullYear(),
          startDate: weekStart,
          endDate: weekEnd,
          content: `## Done
- Reviewed system architecture and performance bottlenecks
- Implemented user authentication improvements  
- Collaborated with team on staging environment setup

## Next
- Complete integration testing
- Review code changes with team
- Plan next sprint deliverables

## Notes
This is sample data for staging environment testing.`
        },
        update: {
          content: `## Done
- Reviewed system architecture and performance bottlenecks
- Implemented user authentication improvements  
- Collaborated with team on staging environment setup

## Next
- Complete integration testing
- Review code changes with team
- Plan next sprint deliverables

## Notes
This is sample data for staging environment testing. Updated: ${new Date().toISOString()}`
        }
      });
    }
    
    // 3. Clean up old staging data if needed
    console.log('🧹 Cleaning up old staging data...');
    
    // Remove staging users that are no longer in our defined list
    const currentStagingIds = STAGING_MOCK_USERS.map(u => u.id);
    const orphanedUsers = await prisma.user.findMany({
      where: {
        id: { startsWith: 'staging_' },
        id: { notIn: currentStagingIds }
      }
    });
    
    if (orphanedUsers.length > 0) {
      console.log(`Removing ${orphanedUsers.length} orphaned staging users...`);
      for (const user of orphanedUsers) {
        await prisma.user.delete({ where: { id: user.id } });
        console.log(`🗑️ Removed: ${user.id}`);
      }
    }
    
    // 4. Verify staging state
    console.log('🔍 Verifying staging environment...');
    const stagingUsers = await prisma.user.findMany({
      where: { id: { startsWith: 'staging_' } },
      orderBy: { id: 'asc' }
    });
    
    console.log(`✅ Staging users verified: ${stagingUsers.length} users`);
    stagingUsers.forEach(user => {
      console.log(`   - ${user.id}: ${user.name} | Onboarded: ${user.onboardingCompletedAt ? '✅' : '❌'}`);
    });
    
    const snippetCount = await prisma.weeklySnippet.count({
      where: { userId: { startsWith: 'staging_' } }
    });
    console.log(`✅ Sample snippets: ${snippetCount} created`);
    
    console.log('🎉 Staging environment initialization completed successfully!');
    
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

module.exports = { initStagingEnvironment, STAGING_MOCK_USERS };