/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TODOIST_CLIENT_ID: process.env.TODOIST_CLIENT_ID,
    TODOIST_CLIENT_SECRET: process.env.TODOIST_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    // Use a custom env var for environment detection since NODE_ENV is reserved
    ENVIRONMENT_MODE: process.env.NODE_ENV,
  },
  // Skip database operations during build time
  skipTrailingSlashRedirect: true
}

module.exports = nextConfig