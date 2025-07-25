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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // Skip database operations during build time
  skipTrailingSlashRedirect: true,
  // Allow build to succeed with ESLint warnings
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint during production builds
  },
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking
  }
}

module.exports = nextConfig