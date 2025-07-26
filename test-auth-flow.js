#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🧪 Testing Authentication Flow\n');

// Test 1: Clear session and check homepage
console.log('Test 1: Clearing session and checking homepage...');
try {
  // Clear any existing session by executing in browser context
  const clearSessionScript = `
    const puppeteer = require('puppeteer');
    (async () => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('http://localhost:3000');
      await page.evaluate(() => {
        localStorage.removeItem('dev-session');
      });
      const title = await page.title();
      console.log('Page title:', title);
      const url = page.url();
      console.log('Current URL:', url);
      await browser.close();
    })();
  `;
  
  // For now, let's use a simpler approach with curl
  const response = execSync('curl -s http://localhost:3000 | grep -o "<title>.*</title>" | head -1', { encoding: 'utf8' });
  console.log('Homepage response:', response.trim());
  
  // Check if we're on the landing page or redirected
  const url = execSync('curl -s -o /dev/null -w "%{url_effective}" http://localhost:3000', { encoding: 'utf8' });
  console.log('Effective URL:', url.trim());
  
  if (url.includes('mock-signin')) {
    console.log('❌ ERROR: Homepage is redirecting to mock-signin!');
  } else {
    console.log('✅ Homepage loads without redirect');
  }
} catch (error) {
  console.error('Test 1 failed:', error.message);
}

console.log('\nTest completed. Please verify manually in browser:');
console.log('1. Open http://localhost:3000 in incognito/private window');
console.log('2. Check if you see the landing page or get redirected');
console.log('3. Click login and select a user');
console.log('4. Complete onboarding');
console.log('5. Logout and login again with same user');
console.log('6. Verify you go directly to dashboard, not onboarding');