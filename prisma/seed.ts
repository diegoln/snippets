import { PrismaClient } from '@prisma/client'
import { generatePast6MonthsWeeks } from '../lib/date-utils'

const prisma = new PrismaClient()

/**
 * Generate realistic weekly snippets for the past 6 months
 * Each snippet has Done/Next format with 3-5 list items per section
 */
function generateWeeklySnippet(weekNumber: number, startDate: Date): string {
  // Sample activities rotating through different areas
  const doneActivities = [
    "Completed user authentication system with OAuth integration and role-based access control",
    "Optimized database queries reducing response time by 40% across core API endpoints", 
    "Implemented comprehensive unit tests for the payment processing module achieving 95% coverage",
    "Led technical design review session for the new microservices architecture proposal",
    "Refactored legacy codebase replacing deprecated dependencies with modern alternatives",
    "Fixed critical production bug affecting user session management and deployed hotfix",
    "Mentored junior developers on React best practices and code review processes",
    "Collaborated with product team to define requirements for the upcoming feature release",
    "Set up automated CI/CD pipeline reducing deployment time from 2 hours to 15 minutes",
    "Conducted security audit of API endpoints and implemented rate limiting measures",
    "Integrated third-party analytics service to track user engagement metrics", 
    "Developed responsive mobile interface for the dashboard using modern CSS grid",
    "Participated in architecture review board discussing database scaling strategies",
    "Implemented real-time notifications system using WebSocket connections",
    "Created technical documentation for the new service-oriented architecture",
    "Resolved performance bottleneck in the search functionality improving speed by 60%",
    "Updated monitoring and alerting system to reduce false positive alerts by 30%",
    "Coordinated with DevOps team to upgrade production infrastructure to latest LTS versions",
    "Built automated data migration scripts for the upcoming database schema changes",
    "Conducted user testing sessions and gathered feedback for the new feature set"
  ]

  const nextActivities = [
    "Begin implementation of the new dashboard analytics feature for Q1 release",
    "Continue working on API documentation and developer portal improvements",
    "Start security penetration testing for the payment processing system",
    "Plan technical debt reduction sprint focusing on legacy code modernization", 
    "Initiate cross-team collaboration on the unified authentication service",
    "Begin performance optimization work on the search and filtering functionality",
    "Start designing the new notification system architecture and data models",
    "Continue mentoring program with focus on advanced TypeScript patterns",
    "Begin integration testing for the new third-party service partnerships",
    "Start research on implementing GraphQL endpoints for mobile app requirements",
    "Continue work on automated testing framework for end-to-end scenarios",
    "Begin planning for the upcoming infrastructure migration to cloud services",
    "Start implementing accessibility improvements to meet WCAG 2.1 standards",
    "Continue development of the real-time collaboration features",
    "Begin technical spike on machine learning integration for user recommendations",
    "Start working on the new admin panel with advanced user management features",
    "Continue optimization of build processes and development workflow improvements",
    "Begin planning for the upcoming security compliance audit preparations", 
    "Start implementation of advanced caching strategies for improved performance",
    "Continue work on the modular component library for design system consistency"
  ]

  // Randomly select 3-5 items for each section
  const doneCount = Math.floor(Math.random() * 3) + 3 // 3-5
  const nextCount = Math.floor(Math.random() * 3) + 3 // 3-5
  
  const selectedDone = doneActivities
    .sort(() => 0.5 - Math.random())
    .slice(0, doneCount)
  
  const selectedNext = nextActivities
    .sort(() => 0.5 - Math.random())  
    .slice(0, nextCount)

  return `## Done
${selectedDone.map(item => `- **${item}**`).join('\n')}

## Next
${selectedNext.map(item => `- [ ] ${item}`).join('\n')}`
}

// Week calculation functions are now in lib/date-utils.ts

async function main() {
  // Only seed in development environment
  if (process.env.NODE_ENV === 'production') {
    console.log('🚫 Skipping seed - Production environment detected')
    console.log('💡 Production should start with blank history')
    return
  }

  console.log('🌱 Starting development database seed...')
  
  // Create test user if it doesn't exist
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      jobTitle: 'Senior Software Engineer',
      seniorityLevel: 'Senior',
      performanceFeedback: 'Continue focusing on technical leadership and cross-team collaboration. Strong technical execution and mentoring contributions noted.'
    }
  })

  console.log(`✅ Created/updated test user: ${testUser.email}`)

  // Generate proper calendar weeks for past 6 months
  const weekData = generatePast6MonthsWeeks()
  const snippetsData: any[] = []

  console.log(`📝 Generating ${weekData.length} weeks of realistic snippet data with proper calendar weeks...`)

  weekData.forEach((week, index) => {
    const content = generateWeeklySnippet(week.weekNumber, week.startDate)
    
    snippetsData.push({
      userId: testUser.id,
      weekNumber: week.weekNumber,
      startDate: week.startDate,
      endDate: week.endDate,
      content: content
    })
  })

  // Insert all snippets
  const result = await prisma.weeklySnippet.createMany({
    data: snippetsData,
    skipDuplicates: true
  })

  console.log(`✅ Created ${result.count} weekly snippets`)
  
  if (weekData.length > 0) {
    console.log(`📅 Date range: ${weekData[weekData.length - 1].startDate.toISOString().split('T')[0]} to ${weekData[0].endDate.toISOString().split('T')[0]}`)
    console.log(`🗓️  Week numbers: ${weekData[weekData.length - 1].weekNumber} to ${weekData[0].weekNumber}`)
    
    console.log('\n📊 Sample snippet preview (most recent week):')
    console.log('─'.repeat(60))
    console.log(`Week ${weekData[0].weekNumber}: ${snippetsData[0].content.substring(0, 200)}...`)
    console.log('─'.repeat(60))
  }
  
  console.log('🎉 Database seeding completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })