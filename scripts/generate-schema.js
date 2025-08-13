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

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

console.log(`🔧 Generating Prisma schema for ${isDevelopment ? 'development' : (process.env.NODE_ENV === 'staging' ? 'staging' : 'production')} environment...`);

// Read the template
const templatePath = path.join(__dirname, '../prisma/schema.template.prisma');
const outputPath = path.join(__dirname, '../prisma/schema.prisma');

// Enhanced error handling
if (!fs.existsSync(templatePath)) {
  console.error('❌ Error: schema.template.prisma not found at:', templatePath);
  console.error('Please ensure the template file exists before running this script.');
  process.exit(1);
}

let schemaContent;
try {
  schemaContent = fs.readFileSync(templatePath, 'utf8');
} catch (error) {
  console.error('❌ Error reading template file:', error.message);
  process.exit(1);
}

// Validate template has required placeholders
const requiredPlaceholders = ['__DB_PROVIDER__', '__METADATA_TYPE__'];
const missingPlaceholders = requiredPlaceholders.filter(placeholder => 
  !schemaContent.includes(placeholder)
);

if (missingPlaceholders.length > 0) {
  console.error('❌ Error: Missing required placeholders in template:');
  missingPlaceholders.forEach(placeholder => {
    console.error(`   - ${placeholder}`);
  });
  console.error('Please update the template file with the required placeholders.');
  process.exit(1);
}

if (isDevelopment) {
  // Development: SQLite configuration
  schemaContent = schemaContent
    .replace(/__DB_PROVIDER__/g, 'sqlite')
    .replace(/__METADATA_TYPE__/g, 'String');
  
  console.log('📱 Development configuration:');
  console.log('   - Database: SQLite');
  console.log('   - Metadata field: String');
} else if (isProduction) {
  // Production/Staging: PostgreSQL configuration
  schemaContent = schemaContent
    .replace(/__DB_PROVIDER__/g, 'postgresql')
    .replace(/__METADATA_TYPE__/g, 'Json');
  
  console.log(`🏭 ${process.env.NODE_ENV === 'staging' ? 'Staging' : 'Production'} configuration:`);
  console.log('   - Database: PostgreSQL');
  console.log('   - Metadata field: Json');
}

// Validate all placeholders were replaced
const remainingPlaceholders = schemaContent.match(/__[A-Z_]+__/g);
if (remainingPlaceholders) {
  console.error('❌ Error: Unreplaced placeholders found:');
  remainingPlaceholders.forEach(placeholder => {
    console.error(`   - ${placeholder}`);
  });
  process.exit(1);
}

// Write the generated schema with error handling
try {
  fs.writeFileSync(outputPath, schemaContent);
} catch (error) {
  console.error('❌ Error writing schema file:', error.message);
  process.exit(1);
}

console.log(`✅ Schema generated successfully: ${outputPath}`);
console.log('');
console.log('Next steps:');
console.log('  npx prisma generate    # Generate Prisma client');
if (isDevelopment) {
  console.log('  npx prisma db push     # Apply schema to SQLite');
} else {
  console.log('  npx prisma migrate deploy  # Apply migrations to PostgreSQL');
}