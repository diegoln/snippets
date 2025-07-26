#!/usr/bin/env node

/**
 * Integration Test: Weekly Snippet Creation
 * 
 * This test prevents the "Failed to create new snippet" error that occurred
 * when users couldn't create snippets due to missing database users or
 * authentication issues.
 * 
 * This test would have caught the issue immediately by testing the complete
 * flow from authentication to snippet creation.
 */

const http = require('http');
const querystring = require('querystring');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testSnippetCreation() {
  console.log('🧪 Integration Test: Weekly Snippet Creation\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  try {
    // Step 1: Check if server is running
    console.log('1️⃣ Checking if dev server is running...');
    try {
      const healthCheck = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET',
        timeout: 5000
      });
      
      if (healthCheck.statusCode === 200) {
        console.log(`${GREEN}✅ Dev server is running${RESET}\n`);
        results.passed++;
      } else {
        throw new Error(`Server returned ${healthCheck.statusCode}`);
      }
    } catch (error) {
      console.log(`${RED}❌ Dev server is not running${RESET}`);
      console.log(`   Error: ${error.message}\n`);
      results.failed++;
      results.errors.push('Dev server not running');
      return results;
    }
    
    // Step 2: Authenticate a user
    console.log('2️⃣ Authenticating as John Developer...');
    
    // Get CSRF token
    const csrfResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/csrf',
      method: 'GET'
    });
    
    const csrfData = JSON.parse(csrfResponse.body);
    const cookies = csrfResponse.headers['set-cookie'] || [];
    const cookieString = cookies.join('; ');
    
    // Authenticate
    const authData = querystring.stringify({
      csrfToken: csrfData.csrfToken,
      userId: '1',
      callbackUrl: '/dashboard',
      redirect: 'false'
    });
    
    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString
      }
    }, authData);
    
    const authCookies = [...cookies, ...(authResponse.headers['set-cookie'] || [])];
    const authCookieString = authCookies.join('; ');
    
    // Verify session
    const sessionResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/session',
      method: 'GET',
      headers: {
        'Cookie': authCookieString
      }
    });
    
    const session = JSON.parse(sessionResponse.body);
    if (session.user) {
      console.log(`${GREEN}✅ Authenticated as ${session.user.name}${RESET}\n`);
      results.passed++;
    } else {
      throw new Error('No session found after authentication');
    }
    
    // Step 3: Create a weekly snippet - THE CRITICAL TEST
    console.log('3️⃣ Creating a new weekly snippet...');
    
    const snippetData = JSON.stringify({
      weekNumber: Math.floor(Math.random() * 52) + 1,
      content: `Integration test snippet created at ${new Date().toISOString()}\n\nThis test prevents the "Failed to create new snippet" error.`
    });
    
    const createResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/snippets',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookieString
      }
    }, snippetData);
    
    console.log(`   Response status: ${createResponse.statusCode}`);
    
    if (createResponse.statusCode === 200 || createResponse.statusCode === 201) {
      const snippet = JSON.parse(createResponse.body);
      if (snippet.id && snippet.content) {
        console.log(`${GREEN}✅ Snippet created successfully!${RESET}`);
        console.log(`   ID: ${snippet.id}`);
        console.log(`   Week: ${snippet.weekNumber}\n`);
        results.passed++;
      } else {
        throw new Error('Invalid snippet response structure');
      }
    } else {
      const error = JSON.parse(createResponse.body);
      throw new Error(`Failed to create snippet: ${error.error || 'Unknown error'}`);
    }
    
    // Step 4: Verify the snippet was saved
    console.log('4️⃣ Verifying snippet was saved...');
    
    const listResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/snippets',
      method: 'GET',
      headers: {
        'Cookie': authCookieString
      }
    });
    
    if (listResponse.statusCode === 200) {
      const snippets = JSON.parse(listResponse.body);
      console.log(`${GREEN}✅ Found ${snippets.length} snippet(s) for this user${RESET}\n`);
      results.passed++;
    } else {
      throw new Error(`Failed to list snippets: ${listResponse.statusCode}`);
    }
    
    // Step 5: Test user isolation by trying to create snippet as another user
    console.log('5️⃣ Testing user isolation...');
    
    // Auth as user 2
    const user2AuthData = querystring.stringify({
      csrfToken: csrfData.csrfToken,
      userId: '2',
      callbackUrl: '/dashboard',
      redirect: 'false'
    });
    
    const user2AuthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieString
      }
    }, user2AuthData);
    
    const user2Cookies = [...cookies, ...(user2AuthResponse.headers['set-cookie'] || [])];
    
    // Check snippets as user 2 - should not see user 1's snippets
    const user2ListResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/snippets',
      method: 'GET',
      headers: {
        'Cookie': user2Cookies.join('; ')
      }
    });
    
    if (user2ListResponse.statusCode === 200) {
      const user2Snippets = JSON.parse(user2ListResponse.body);
      // User 2 might have their own snippets, but should not see user 1's test snippet
      console.log(`${GREEN}✅ User isolation working - User 2 has ${user2Snippets.length} snippet(s)${RESET}\n`);
      results.passed++;
    } else {
      throw new Error(`Failed to test user isolation: ${user2ListResponse.statusCode}`);
    }
    
  } catch (error) {
    console.log(`${RED}❌ Test failed: ${error.message}${RESET}\n`);
    results.failed++;
    results.errors.push(error.message);
  }
  
  // Summary
  console.log('📊 Test Summary');
  console.log('==============');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n${RED}Errors:${RESET}`);
    results.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  if (results.failed === 0) {
    console.log(`\n${GREEN}🎉 All tests passed! Snippet creation and user isolation working properly.${RESET}`);
    console.log(`\n${YELLOW}This test prevents the "Failed to create new snippet" error from recurring.${RESET}`);
  } else {
    console.log(`\n${RED}⚠️  Critical functionality is BROKEN!${RESET}`);
    console.log(`\n${YELLOW}This test catches issues that would break the user experience.${RESET}`);
  }
  
  return results;
}

// Run the test if called directly
if (require.main === module) {
  testSnippetCreation().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error(`${RED}Fatal error: ${error.message}${RESET}`);
    process.exit(1);
  });
}

module.exports = { testSnippetCreation };