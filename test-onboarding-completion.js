#!/usr/bin/env node

/**
 * Test Onboarding Completion Flow
 * 
 * This script tests the complete onboarding flow including the final dashboard navigation
 * to ensure there are no delays in the "Go to Dashboard" button.
 */

const baseUrl = process.env.TEST_URL || 'http://localhost:3000'

async function testOnboardingCompletion() {
  console.log('🧪 Testing Onboarding Completion Flow')
  
  try {
    // Step 1: Reset onboarding
    console.log('1️⃣ Resetting onboarding...')
    const resetResponse = await fetch(`${baseUrl}/api/user/onboarding`, {
      method: 'DELETE',
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!resetResponse.ok) {
      throw new Error(`Reset failed: ${resetResponse.status}`)
    }
    
    console.log('✅ Onboarding reset successfully')
    
    // Step 2: Verify profile shows incomplete onboarding
    console.log('2️⃣ Checking profile status...')
    const profileResponse = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`)
    }
    
    const profile = await profileResponse.json()
    if (profile.onboardingCompleted) {
      throw new Error('Profile should show onboarding as incomplete')
    }
    
    console.log('✅ Profile correctly shows onboarding incomplete')
    
    // Step 3: Complete onboarding
    console.log('3️⃣ Completing onboarding...')
    const completeStart = Date.now()
    
    const completeResponse = await fetch(`${baseUrl}/api/user/onboarding`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Dev-User-Id': 'dev-user-123'
      },
      body: JSON.stringify({ completed: true })
    })
    
    if (!completeResponse.ok) {
      throw new Error(`Completion failed: ${completeResponse.status}`)
    }
    
    const completeTime = Date.now() - completeStart
    console.log(`✅ Onboarding completed in ${completeTime}ms`)
    
    // Step 4: Verify profile shows completed onboarding
    console.log('4️⃣ Verifying completion status...')
    const verifyStart = Date.now()
    
    const verifyResponse = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.status}`)
    }
    
    const verifiedProfile = await verifyResponse.json()
    if (!verifiedProfile.onboardingCompleted) {
      throw new Error('Profile should show onboarding as completed')
    }
    
    const verifyTime = Date.now() - verifyStart
    console.log(`✅ Profile verification completed in ${verifyTime}ms`)
    
    // Step 5: Test the dashboard navigation speed
    console.log('5️⃣ Testing dashboard navigation speed...')
    const dashboardStart = Date.now()
    
    const dashboardResponse = await fetch(baseUrl, {
      headers: { 'X-Dev-User-Id': 'dev-user-123' }
    })
    
    if (!dashboardResponse.ok) {
      throw new Error(`Dashboard load failed: ${dashboardResponse.status}`)
    }
    
    const dashboardTime = Date.now() - dashboardStart
    console.log(`✅ Dashboard loaded in ${dashboardTime}ms`)
    
    // Summary
    console.log('\n📊 Performance Summary:')
    console.log(`   Onboarding completion: ${completeTime}ms`)
    console.log(`   Profile verification: ${verifyTime}ms`) 
    console.log(`   Dashboard load: ${dashboardTime}ms`)
    console.log(`   Total flow time: ${completeTime + verifyTime + dashboardTime}ms`)
    
    if (dashboardTime > 2000) {
      console.log('⚠️  Dashboard load took longer than 2 seconds')
    } else {
      console.log('🚀 Dashboard load performance is good!')
    }
    
    console.log('\n✅ All tests passed! Onboarding completion flow is working correctly.')
    
    return {
      success: true,
      times: {
        completion: completeTime,
        verification: verifyTime,
        dashboard: dashboardTime,
        total: completeTime + verifyTime + dashboardTime
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOnboardingCompletion()
    .then(result => {
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test runner error:', error)
      process.exit(1)
    })
}

module.exports = { testOnboardingCompletion }