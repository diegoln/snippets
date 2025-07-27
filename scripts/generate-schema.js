#!/usr/bin/env node

/**
 * Schema Generation Script
 * 
 * Generates the appropriate prisma/schema.prisma file based on the environment:
 * - Development: SQLite with String metadata field
 * - Production: PostgreSQL with Json metadata field
 * 
 * Usage:
 *   npm run generate-schema
 *   NODE_ENV=production npm run generate-schema
 */

const fs = require('fs');
const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';

console.log(`🔧 Generating Prisma schema for ${isDevelopment ? 'development' : 'production'} environment...`);

// Read the template
const templatePath = path.join(__dirname, '../prisma/schema.template.prisma');
const outputPath = path.join(__dirname, '../prisma/schema.prisma');

if (!fs.existsSync(templatePath)) {
  console.error('❌ Error: schema.template.prisma not found');
  process.exit(1);
}

let schemaContent = fs.readFileSync(templatePath, 'utf8');

if (isDevelopment) {
  // Development: SQLite configuration
  schemaContent = schemaContent
    .replace('__DB_PROVIDER__', 'sqlite')
    .replace('__METADATA_TYPE__', 'String');
  
  console.log('📱 Development configuration:');
  console.log('   - Database: SQLite');
  console.log('   - Metadata field: String');
} else {
  // Production: PostgreSQL configuration
  schemaContent = schemaContent
    .replace('__DB_PROVIDER__', 'postgresql')
    .replace('__METADATA_TYPE__', 'Json');
  
  console.log('🏭 Production configuration:');
  console.log('   - Database: PostgreSQL');
  console.log('   - Metadata field: Json');
}

// Write the generated schema
fs.writeFileSync(outputPath, schemaContent);

console.log(`✅ Schema generated successfully: ${outputPath}`);
console.log('');
console.log('Next steps:');
console.log('  npx prisma generate    # Generate Prisma client');
if (isDevelopment) {
  console.log('  npx prisma db push     # Apply schema to SQLite');
} else {
  console.log('  npx prisma migrate deploy  # Apply migrations to PostgreSQL');
}