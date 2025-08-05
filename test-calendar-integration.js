#!/usr/bin/env node

/**
 * Test Calendar Integration in Onboarding Flow
 * 
 * This script simulates the user going through onboarding and testing 
 * that the calendar integration works correctly.
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:3000'

async function testCalendarIntegration() {
  console.log('🧪 Testing Calendar Integration in Onboarding')
  
  try {
    // Step 1: Reset onboarding to start fresh
    console.log('1️⃣ Resetting onboarding...')
    const resetResponse = await fetch(`${baseUrl}/api/user/onboarding`, {
      method: 'DELETE',
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!resetResponse.ok) {
      throw new Error(`Reset failed: ${resetResponse.status}`)
    }
    console.log('✅ Onboarding reset successfully')
    
    // Step 2: Save profile (simulate step 1 of onboarding)
    console.log('2️⃣ Saving profile...')
    const profileResponse = await fetch(`${baseUrl}/api/user/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-Dev-User-Id': 'dev-user-123'
      },
      body: JSON.stringify({
        jobTitle: 'Software Engineer',
        seniorityLevel: 'Senior Software Engineer'
      })
    })
    
    if (!profileResponse.ok) {
      throw new Error(`Profile save failed: ${profileResponse.status}`)
    }
    console.log('✅ Profile saved successfully')
    
    // Step 3: Test loading existing integrations (like the onboarding wizard does)
    console.log('3️⃣ Loading existing integrations...')
    const integrationsResponse = await fetch(`${baseUrl}/api/integrations`, {
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!integrationsResponse.ok) {
      throw new Error(`Load integrations failed: ${integrationsResponse.status}`)
    }
    
    const integrationsData = await integrationsResponse.json()
    const existingIntegrations = integrationsData.integrations || []
    console.log(`✅ Found ${existingIntegrations.length} existing integrations`)
    
    // Clean up any existing calendar integrations
    const calendarIntegrations = existingIntegrations.filter(i => i.type === 'google_calendar')
    for (const integration of calendarIntegrations) {
      console.log(`🗑️ Removing existing calendar integration: ${integration.id}`)
      await fetch(`${baseUrl}/api/integrations?id=${integration.id}`, {
        method: 'DELETE',
        headers: { 'X-Dev-User-Id': 'dev-user-123' }
      })
    }
    
    // Step 4: Test calendar integration connection (like the onboarding wizard does)
    console.log('4️⃣ Connecting calendar integration...')
    const connectStart = Date.now()
    
    // Create integration
    const connectResponse = await fetch(`${baseUrl}/api/integrations`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Dev-User-Id': 'dev-user-123'
      },
      body: JSON.stringify({ type: 'google_calendar' })
    })
    
    if (!connectResponse.ok) {
      const errorData = await connectResponse.json()
      throw new Error(`Calendar connection failed: ${connectResponse.status} - ${errorData.error}`)
    }
    
    const connectTime = Date.now() - connectStart
    console.log(`✅ Calendar integration connected in ${connectTime}ms`)
    
    // Step 5: Test fetching calendar data (like the onboarding wizard does)
    console.log('5️⃣ Fetching calendar data...')
    const dataStart = Date.now()
    
    const dataResponse = await fetch(`${baseUrl}/api/integrations?test=true`, {
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!dataResponse.ok) {
      throw new Error(`Calendar data fetch failed: ${dataResponse.status}`)
    }
    
    const calendarData = await dataResponse.json()
    const dataTime = Date.now() - dataStart
    console.log(`✅ Calendar data fetched in ${dataTime}ms`)
    console.log(`   - Total meetings: ${calendarData.weekData?.totalMeetings || 0}`)
    console.log(`   - Meeting context: ${calendarData.weekData?.meetingContext?.length || 0} items`)
    
    // Step 6: Test LLM snippet generation (like the onboarding wizard does)
    console.log('6️⃣ Generating weekly snippet from calendar data...')
    const snippetStart = Date.now()
    
    const snippetResponse = await fetch(`${baseUrl}/api/snippets/generate-from-integration`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Dev-User-Id': 'dev-user-123'
      },
      body: JSON.stringify({
        integrationType: 'google_calendar',
        weekData: calendarData.weekData,
        userProfile: {
          jobTitle: 'Software Engineer',
          seniorityLevel: 'Senior Software Engineer'
        }
      })
    })
    
    if (!snippetResponse.ok) {
      const errorData = await snippetResponse.json()
      throw new Error(`Snippet generation failed: ${snippetResponse.status} - ${errorData.error}`)
    }
    
    const snippetData = await snippetResponse.json()
    const snippetTime = Date.now() - snippetStart
    console.log(`✅ Weekly snippet generated in ${snippetTime}ms`)
    console.log(`   - Bullets generated: ${snippetData.bullets?.length || 0}`)
    console.log(`   - Snippet length: ${snippetData.weeklySnippet?.length || 0} chars`)
    
    // Step 7: Test reflection generation (like the onboarding wizard does)
    console.log('7️⃣ Generating reflection draft...')
    const reflectionStart = Date.now()
    
    const reflectionResponse = await fetch(`${baseUrl}/api/assessments/generate-reflection-draft`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Dev-User-Id': 'dev-user-123'
      },
      body: JSON.stringify({
        weeklySnippet: snippetData.weeklySnippet,
        bullets: snippetData.bullets,
        userProfile: {
          jobTitle: 'Software Engineer',
          seniorityLevel: 'Senior Software Engineer'
        }
      })
    })
    
    let reflectionTime = Date.now() - reflectionStart
    if (reflectionResponse.ok) {
      const reflectionData = await reflectionResponse.json()
      console.log(`✅ Reflection draft generated in ${reflectionTime}ms`)
      console.log(`   - Reflection length: ${reflectionData.reflectionDraft?.length || 0} chars`)
    } else {
      console.log(`⚠️ Reflection generation failed in ${reflectionTime}ms, but continuing (non-critical)`)
    }
    
    // Summary
    console.log('\\n📊 Calendar Integration Test Summary:')
    console.log(`   Connection time: ${connectTime}ms`)
    console.log(`   Data fetch time: ${dataTime}ms`)
    console.log(`   Snippet generation: ${snippetTime}ms`)
    console.log(`   Total integration time: ${connectTime + dataTime + snippetTime}ms`)
    
    if (connectTime + dataTime + snippetTime > 5000) {
      console.log('⚠️  Total integration time is > 5 seconds')
    } else {
      console.log('🚀 Calendar integration performance is good!')
    }
    
    console.log('\\n🎉 Calendar integration test completed successfully!')
    console.log('\\nNow the user can proceed through onboarding and the calendar should work.')
    
    return {
      success: true,
      times: {
        connection: connectTime,
        dataFetch: dataTime,
        snippetGeneration: snippetTime,
        total: connectTime + dataTime + snippetTime
      }
    }
    
  } catch (error) {
    console.error('\\n❌ Calendar integration test failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCalendarIntegration()
    .then(result => {
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test runner error:', error)
      process.exit(1)
    })
}

module.exports = { testCalendarIntegration }