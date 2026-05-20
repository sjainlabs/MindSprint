# Analysis: User Object Getting Stuck Even When Google Auth Works

## Problem Description
Google authentication completes successfully, but the user object may not be found, causing:
- Dashboard fails to load
- Parent profile returns null
- "Unable to find user object" errors

## Root Causes Identified

### 1. **SessionRestorePromise Race Condition** ⚠️
**Location:** `auth.service.ts` lines 54, 67-70, 109-111

**Issue:**
- `sessionRestorePromise` is cached and reused
- After first call, promise is nulled out
- But if called concurrently, it returns the cached promise which may not match current auth state
- Multiple calls (ParentLogin + ParentAuthGuard + APP_INITIALIZER) can create conflicts

**Scenario:**
```
Time 1: APP_INITIALIZER calls handleRedirectLogin() → promises P1
Time 2: ParentAuthGuard calls handleRedirectLogin() → gets P1 (same promise)
Time 3: P1 resolves → sessionRestorePromise = null
Time 4: ParentLogin calls handleRedirectLogin() → new promise P2
Time 5: If timing is off, user state changes get missed
```

### 2. **Firebase Init Wait is Too Short** ⚠️
**Location:** `auth.service.ts` lines 572-581

**Issue:**
```typescript
private async waitForFirebaseInit(): Promise<void> {
  await new Promise<void>(resolve => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();  // ← Unsubscribes immediately after FIRST fire
      resolve();
    });
  });
}
```

**Problem:** 
- In some scenarios, auth state changes can fire multiple times during initialization
- First fire might be temporary/incomplete auth state
- Then actual auth state arrives, but waitForFirebaseInit has already resolved

### 3. **getParentProfile() with Firestore Lag** ⚠️
**Location:** `auth.service.ts` lines 207-239

**Issue:**
- After Google auth succeeds, `auth.currentUser` is available
- But Firestore hasn't necessarily synced the parent profile yet
- `ensureParentProfile()` is called but fires async writes
- If `getParentProfile()` is called immediately, parent doc might not exist yet

### 4. **Multiple Concurrent Calls to handleRedirectLogin()** ⚠️
**Location:** `app.config.ts` (APP_INITIALIZER) + `components` calling it

**Issue:**
- APP_INITIALIZER calls it: `AuthService.handleRedirectLogin()`
- ParentAuthGuard calls it: `AuthService.handleRedirectLogin()`
- ParentLogin component calls it: `AuthService.handleRedirectLogin()`
- This creates 3 concurrent invocations

If they happen simultaneously and caching/promise resolution isn't handled properly:
- One might reset sessionRestorePromise
- Another might be waiting on a stale promise
- Result: inconsistent auth state

## Recommended Fixes

### Fix #1: Prevent sessionRestorePromise Race Condition
- Only cache the promise while it's pending
- Once resolved, clear cache immediately
- On next call, create fresh promise
- OR: Remove caching entirely and ensure idempotency

### Fix #2: Better Firebase Init Detection
- Add additional checks for:
  - Firestore connection status
  - Parent profile existence
  - Network connectivity

### Fix #3: Add Retry Logic with Timeout
- If parent profile not found, retry up to 3 times with backoff
- Timeout after 5 seconds total

### Fix #4: Centralize handleRedirectLogin
- Only call it once in APP_INITIALIZER
- Broadcast result to all components
- Don't call it redundantly in guards/components

## Expected Behavior After Fix
```
1. User completes Google auth
2. Auth state updated
3. Firestore parent profile exists (or is created)
4. getParentProfile() succeeds
5. Student list loads
6. Dashboard displays without error
```

## How to Test Fix
1. Open DevTools Console
2. Look for timing of these logs:
   - `[Auth] Redirect result found`
   - `[Auth] Parent profile ensured`
   - `[ParentDashboard] Parent profile loaded`
3. All should appear within 1-2 seconds
4. No "Parent profile is null" errors should appear


