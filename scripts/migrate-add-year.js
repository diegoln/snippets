#!/usr/bin/env node

/**
 * Migration script to add year column to production database
 * 
 * This script connects to the production database and adds the year column
 * to the weekly_snippets table, which is required for the fix to issue #23.
 */

const { PrismaClient } = require('@prisma/client');

async function runMigration() {
  const prisma = new PrismaClient();
  
  console.log('🔄 Starting migration to add year column...');
  
  try {
    // Check if year column already exists
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'weekly_snippets' 
      AND column_name = 'year'
    `;
    
    if (checkColumn.length > 0) {
      console.log('✅ Year column already exists, skipping migration');
      return;
    }
    
    console.log('📊 Adding year column to weekly_snippets table...');
    
    // Add year column (nullable initially)
    await prisma.$executeRaw`
      ALTER TABLE "weekly_snippets" ADD COLUMN "year" INTEGER
    `;
    
    console.log('📝 Updating existing records with year from startDate...');
    
    // Update existing records
    await prisma.$executeRaw`
      UPDATE "weekly_snippets" 
      SET "year" = EXTRACT(YEAR FROM "startDate")
    `;
    
    console.log('🔒 Making year column NOT NULL...');
    
    // Make year column required
    await prisma.$executeRaw`
      ALTER TABLE "weekly_snippets" ALTER COLUMN "year" SET NOT NULL
    `;
    
    console.log('🔑 Updating unique constraint...');
    
    // Drop old constraint
    await prisma.$executeRaw`
      ALTER TABLE "weekly_snippets" 
      DROP CONSTRAINT IF EXISTS "weekly_snippets_userId_weekNumber_key"
    `;
    
    // Add new constraint
    await prisma.$executeRaw`
      ALTER TABLE "weekly_snippets" 
      ADD CONSTRAINT "weekly_snippets_userId_year_weekNumber_key" 
      UNIQUE ("userId", "year", "weekNumber")
    `;
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };