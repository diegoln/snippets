#!/usr/bin/env node

/**
 * Debug script to simulate OnboardingWizard button behavior
 * This simulates the exact state management logic to find the bug
 */

// Simulate the state management logic from OnboardingWizard
class ButtonStateMachine {
  constructor() {
    this.isConnecting = null
    this.connectedIntegrations = new Set()
    this.integrationBullets = {}
    
    this.integrations = [
      { id: 'google_calendar', name: 'Google Calendar' },
      { id: 'github', name: 'GitHub' },
      { id: 'jira', name: 'Jira' }
    ]
  }

  // Simulate what each button should render
  getButtonState(integrationId) {
    const isThisConnecting = this.isConnecting === integrationId
    const isThisConnected = this.connectedIntegrations.has(integrationId)
    const isDisabled = this.isConnecting !== null
    
    let display
    if (isThisConnecting) {
      display = 'SPINNER'
    } else if (isThisConnected) {
      display = '✓ Connected'
    } else {
      display = 'Connect'
    }
    
    return {
      display,
      disabled: isDisabled,
      color: isThisConnected ? 'green' : 'blue'
    }
  }

  // Print current state of all buttons
  printButtonStates(action = '') {
    console.log(`\n=== ${action} ===`)
    console.log(`isConnecting: ${this.isConnecting}`)
    console.log(`connectedIntegrations: [${Array.from(this.connectedIntegrations).join(', ')}]`)
    
    this.integrations.forEach(integration => {
      const state = this.getButtonState(integration.id)
      console.log(`${integration.name}: ${state.display} (${state.color}, disabled: ${state.disabled})`)
    })
  }

  // Simulate clicking a button
  async clickButton(integrationId) {
    console.log(`\n🔘 CLICK: ${integrationId}`)
    
    // Check if already connected (should not connect again)
    if (this.connectedIntegrations.has(integrationId)) {
      console.log(`   ⚠️  Already connected, ignoring click`)
      return
    }
    
    // Start connecting
    this.isConnecting = integrationId
    this.printButtonStates(`After clicking ${integrationId}`)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100)) // Shorter for testing
    
    // Complete connection
    this.connectedIntegrations.add(integrationId)
    this.integrationBullets[integrationId] = [`Mock bullet for ${integrationId}`]
    this.isConnecting = null
    
    this.printButtonStates(`After ${integrationId} connected`)
  }
}

// Run the test scenario
async function runTest() {
  console.log('🧪 Testing OnboardingWizard Button Behavior')
  
  const machine = new ButtonStateMachine()
  
  // Initial state
  machine.printButtonStates('Initial state')
  
  // Test 1: Click first button
  await machine.clickButton('google_calendar')
  
  // Expected: Calendar shows "✓ Connected", others show "Connect"
  const expectedAfterFirst = {
    google_calendar: { display: '✓ Connected', color: 'green', disabled: false },
    github: { display: 'Connect', color: 'blue', disabled: false },
    jira: { display: 'Connect', color: 'blue', disabled: false }
  }
  
  console.log('\n🔍 CHECKING: After first connection')
  let passed = true
  machine.integrations.forEach(integration => {
    const actual = machine.getButtonState(integration.id)
    const expected = expectedAfterFirst[integration.id]
    
    const match = actual.display === expected.display && 
                  actual.color === expected.color && 
                  actual.disabled === expected.disabled
    console.log(`${integration.name}: ${match ? '✅' : '❌'} Expected: ${expected.display}/${expected.color}/${expected.disabled}, Got: ${actual.display}/${actual.color}/${actual.disabled}`)
    if (!match) passed = false
  })
  
  if (!passed) {
    console.log('\n❌ TEST FAILED after first connection')
    return false
  }
  
  // Test 2: Click second button
  await machine.clickButton('github')
  
  // Expected: Calendar still "✓ Connected", GitHub now "✓ Connected", Jira still "Connect"
  const expectedAfterSecond = {
    google_calendar: { display: '✓ Connected', color: 'green', disabled: false },
    github: { display: '✓ Connected', color: 'green', disabled: false },
    jira: { display: 'Connect', color: 'blue', disabled: false }
  }
  
  console.log('\n🔍 CHECKING: After second connection')
  machine.integrations.forEach(integration => {
    const actual = machine.getButtonState(integration.id)
    const expected = expectedAfterSecond[integration.id]
    
    const match = actual.display === expected.display && 
                  actual.color === expected.color && 
                  actual.disabled === expected.disabled
    console.log(`${integration.name}: ${match ? '✅' : '❌'} Expected: ${expected.display}/${expected.color}/${expected.disabled}, Got: ${actual.display}/${actual.color}/${actual.disabled}`)
    if (!match) passed = false
  })
  
  if (passed) {
    console.log('\n✅ ALL TESTS PASSED')
    return true
  } else {
    console.log('\n❌ TEST FAILED after second connection')
    return false
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1)
})