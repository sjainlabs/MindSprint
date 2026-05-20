# Testing Manual - User Object Fix

## Quick Start

### Step-by-Step Test

#### Step 1: Clear Browser Storage (Fresh Start)
1. Open DevTools (F12)
2. Application → Storage → Clear Site Data
3. Refresh the page

#### Step 2: Log In with Google
1. Go to `/login/parent`
2. Click "Login with Google"
3. Authenticate with your account
4. **Expected:** Redirected to `/parent/dashboard`

#### Step 3: Verify Console Logs
Open DevTools Console and verify:
- ✅ `[Auth] handleRedirectLogin called`
- ✅ `[Auth] Auth state changed (call 1):`
- ✅ `[Auth] Auth state changed (call 2):` ← Important! Should see call 2
- ✅ `[Auth] Firebase auth initialized`
- ✅ `[Auth] Creating new parent profile...`
- ✅ `[ParentDashboard] Parent profile loaded:`
- ❌ Should NOT see: `[ParentDashboard] Parent profile is null`

#### Step 4: Verify Dashboard Loads
1. Dashboard should load within 2-3 seconds
2. Your email should be visible
3. "No students yet" message or list of students appears
4. Add Student form is visible

#### Step 5: Add a Student
1. Enter name: "Test Student"
2. Select grade: "3rd"
3. Click "Add Student"
4. **Expected:** Student appears in list with a 6-digit code
5. Console shows: `[ParentDashboard] Student created: Test Student Code: XXXXXX`

#### Step 6: Test Page Refresh (Session Persistence)
1. Copy the student code
2. Refresh the page (F5)
3. **Expected:** 
   - Dashboard loads immediately (no login required)
   - Student still visible with same code
   - Console shows faster login ✅ `[ParentAuthGuard] User already logged in, allowing access`

---

## Key Behaviors AFTER Fix

### ✅ What Should Happen

| Scenario | Expected Behavior |
|----------|------------------|
| First login | Sees 2 auth state changes in console |
| Parent profile query | Tries up to 3 times if not found |
| Dashboard loads | Completes in 2-3 seconds max |
| Refresh page | Stays logged in (session persists) |
| Multiple guards check | Fast path (no re-query) |
| Firestore latency | Retries automatically |

### ❌ What Should NOT Happen

| Issue | Status |
|-------|--------|
| "Parent profile is null" error | ✅ FIXED |
| "User object not found" | ✅ FIXED |
| Race condition on auth | ✅ FIXED |
| Delay/loading spinner stuck | ✅ FIXED |
| Multiple retry logs in console (more than 3) | ✅ FIXED |

---

## Console Log Reference

### Success Pattern (After Fix)
```
[Auth] handleRedirectLogin called
[Auth] Waiting for Firebase auth initialization...
[Auth] Setting up Firebase init listener...
[Auth] Auth state changed (call 1): user@gmail.com
[Auth] Auth state changed (call 2): user@gmail.com
[Auth] Firebase auth initialized
[Auth] Checking redirect result...
[Auth] Redirect result found, user: user@gmail.com
[Auth] Ensuring parent profile for user: user@gmail.com
[Auth] Checking if parent profile exists in Firestore...
[Auth] Firestore check completed, exists: false
[Auth] Creating new parent profile...
[Auth] Parent profile created successfully
[Auth] Parent profile ensured
[ParentAuthGuard] Checking parent auth...
[ParentAuthGuard] User already logged in, allowing access
[ParentDashboard] Component initialized
[ParentDashboard] Loading dashboard...
[ParentDashboard] Current user: user@gmail.com
[Auth] getParentProfile called
[Auth] Firestore query for parent: [UID] attempt: 1
[Auth] Firestore query for parent: [UID] exists: true
[ParentDashboard] Parent profile result: user@gmail.com
[ParentDashboard] Students loaded: 0
[ParentDashboard] Dashboard loaded successfully
```

### Signs of Success
- ✅ Two auth state change logs
- ✅ Parent profile loads on first Firestore attempt
- ✅ Dashboard shows parent email
- ✅ All operations complete within 3 seconds

---

## Troubleshooting

### Issue: Still seeing "Profile is null"
**Check:**
1. Are you getting `[Auth] Auth state changed (call 2):`?
   - If NO: Increase `waitForFirebaseInit` timeout (line 641 in auth.service.ts)
   - If NO: Check Firebase configuration in environment

2. Are you getting `[Auth] Firestore query for parent exists: true`?
   - If NO: Check Firestore Rules (might be blocking reads)
   - If NO: Verify Firestore is enabled in Firebase Console

3. Are you getting retry logs?
   ```
   [Auth] Firestore query for parent: [UID] attempt: 2
   [Auth] Firestore query for parent: [UID] attempt: 3
   ```
   - If YES: Expected if Firestore is syncing slowly
   - If occurring every time: May indicate Firestore permission issue

### Issue: Dashboard loads but students disappear on refresh
**Check:**
1. Are students in Firestore? (Check Firebase Console)
2. Are students in localStorage? (DevTools → Application → Local Storage)
3. Look for "Using local students fallback" in console

### Issue: Console logs showing old pattern
**Check:**
1. Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache (DevTools → Application → Storage → Clear)
3. Check that your build includes the updated files

---

## Performance Baseline

### Expected Timings

| Operation | Time |
|-----------|------|
| Google Auth Redirect | 2-5 seconds (Google's server) |
| Firebase Init Wait | 500-1000ms |
| Parent Profile Creation | 200-500ms |
| Dashboard Load | 500-1000ms |
| **Total Start-to-Dashboard** | **4-8 seconds** |

### With Cache (Refresh)
| Operation | Time |
|-----------|------|
| Check if logged in | <10ms |
| Load cached profile | <10ms |
| Load students from local | <50ms |
| **Total Refresh-to-Dashboard** | **<1 second** |

---

## Regression Tests

Run these tests in order to verify no regressions:

- [ ] **Test 1:** Fresh login → Dashboard loads
- [ ] **Test 2:** Add student → Code appears
- [ ] **Test 3:** Refresh page → Still logged in
- [ ] **Test 4:** Clear storage & login again → Works
- [ ] **Test 5:** Offline mode → Falls back gracefully
- [ ] **Test 6:** Student login with code → Works
- [ ] **Test 7:** Go to student home → Loads subjects

---

**Document Date:** 2026-05-19
**Compatible Version:** Angular 18+
**Tested With:** Firebase Auth + Firestore


