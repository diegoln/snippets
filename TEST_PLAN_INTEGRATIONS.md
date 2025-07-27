# Integration Loading Test Plan

## Overview
Comprehensive test plan for the integration loading timeout and error handling feature.

## Test Environment Setup
1. Ensure PostgreSQL is running: `docker-compose up -d postgres`
2. Start dev server: `npm run dev`
3. Open browser dev tools to monitor console and network

## Test Scenarios

### 1. Happy Path - Successful Load
**Steps:**
1. Navigate to Settings → Integrations tab
2. Observe loading spinner
3. Verify integrations load successfully

**Expected:**
- Loading spinner shows briefly
- Integrations UI appears
- No console errors
- Network request completes < 10 seconds

### 2. Timeout Scenario
**Steps:**
1. Throttle network to "Slow 3G" in browser dev tools
2. Navigate to Settings → Integrations tab
3. Wait 10+ seconds

**Expected:**
- Loading spinner shows for exactly 10 seconds
- Error UI appears with "Request timed out" message
- "Try Again" button is visible
- Console shows "Integration fetch timeout"
- Network request is aborted

### 3. Authentication Error (401)
**Steps:**
1. Clear browser cookies/session
2. Navigate directly to Settings → Integrations
3. Observe error state

**Expected:**
- Error UI shows "Authentication required. Please sign in again."
- Console logs 401 error
- Try Again button visible

### 4. Server Error (500)
**Steps:**
1. Stop backend server
2. Navigate to Settings → Integrations
3. Observe error state

**Expected:**
- Error UI shows "Failed to load integrations (500)"
- Try Again button visible
- Console shows error details

### 5. Network Failure
**Steps:**
1. Disconnect network/go offline
2. Navigate to Settings → Integrations
3. Observe error state

**Expected:**
- Error UI shows "Failed to load integrations. Please check your connection."
- Try Again button visible
- No infinite loading

### 6. Quick Navigation Away
**Steps:**
1. Navigate to Settings → Integrations
2. Immediately switch to another tab before loading completes
3. Check console for errors

**Expected:**
- No console errors about updating unmounted components
- No memory leaks
- Fetch request is aborted

### 7. Retry Functionality
**Steps:**
1. Trigger any error scenario above
2. Click "Try Again" button
3. Observe behavior

**Expected:**
- Page reloads
- Loading process starts fresh
- Previous error cleared

### 8. Multiple Tab Switching
**Steps:**
1. Navigate to Settings → Performance tab
2. Switch to Integrations tab
3. Switch back to Performance before loading
4. Switch to Integrations again

**Expected:**
- Each switch starts fresh load
- No duplicate requests
- No console errors
- Proper cleanup between switches

### 9. Slow Response (Not Timeout)
**Steps:**
1. Throttle to "Fast 3G"
2. Navigate to Settings → Integrations
3. Wait for load (should be 3-8 seconds)

**Expected:**
- Loading completes before timeout
- No error state
- Integrations display properly

### 10. Already Connected Integration
**Steps:**
1. Connect Google Calendar integration
2. Navigate away and back to Integrations

**Expected:**
- Shows "Connected" status
- Last sync time displayed
- Disconnect option available

## Performance Metrics

### Load Time Targets
- Fast connection: < 2 seconds
- Average connection: < 5 seconds
- Slow connection: < 10 seconds (or timeout)

### Memory Usage
- Check browser memory before/after multiple navigations
- No memory leaks from uncleaned timeouts/requests

### Console Health
- Zero errors in happy path
- Only expected errors in failure scenarios
- No React state update warnings

## Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Try Again button reachable and activatable
   - Loading state announced to screen readers

2. **Screen Reader**
   - Loading state announced
   - Error messages read clearly
   - Button purposes clear

3. **Visual**
   - Sufficient color contrast on error states
   - Loading spinner visible
   - Error icons meaningful

## Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsiveness

1. Test on mobile viewport sizes
2. Ensure error UI is readable
3. Buttons are tappable
4. No horizontal scroll

## Edge Cases

1. **Clock Skew**: Change system time during load
2. **Multiple Windows**: Open integrations in multiple tabs
3. **Stale Auth**: Use expired auth token
4. **Race Conditions**: Rapid clicking between tabs
5. **Browser Back/Forward**: Use browser navigation during load

## Regression Testing

Ensure existing functionality still works:
1. Calendar connection flow
2. Integration data display
3. Settings page navigation
4. Other settings tabs

## Security Testing

1. Verify no sensitive data in console logs
2. Check network requests include proper auth
3. Ensure errors don't leak internal details
4. Verify CORS headers are correct

## Success Criteria

✅ All test scenarios pass
✅ No memory leaks detected
✅ Performance targets met
✅ Zero console errors in happy path
✅ Accessibility standards met
✅ Works across all supported browsers
✅ Security best practices followed

## Sign-off

- [ ] Developer testing complete
- [ ] Code review passed
- [ ] QA testing complete
- [ ] Product owner approval
- [ ] Ready for deployment