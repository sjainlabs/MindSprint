# Authentication & Dashboard Flow Architecture

## High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MindSprint Parent Portal                       │
└─────────────────────────────────────────────────────────────────┘

START
  │
  ├─→ App Initializer (app.config.ts)
  │   └─→ handleRedirectLogin() [checks for Google redirect]
  │
  ├─→ App Component (app.ts)
  │   └─→ Listens to onAuthStateChanged
  │       └─→ If user on /login → redirect to /parent/dashboard
  │
  ├─→ Parent Login Page (parent-login)
  │   ├─→ Shows login button
  │   ├─→ onClick: startGoogleRedirectLogin()
  │   │   └─→ Firebase signInWithRedirect() → Google OAuth
  │   │
  │   └─→ After Google redirect → onAuthStateChanged triggers
  │       └─→ Navigates to /parent/dashboard
  │
  ├─→ Parent Auth Guard (parent-auth.guard.ts)
  │   ├─→ Calls handleRedirectLogin() again
  │   ├─→ Checks if user is authenticated
  │   └─→ If yes → allows access
  │       └─→ If no → redirects to /login/parent
  │
  └─→ Parent Dashboard (parent-dashboard)
      ├─→ Loads parent profile from Firestore
      ├─→ Shows profile (email, subscription)
      ├─→ Shows students list (if any)
      ├─→ Add Student form
      │   ├─→ Input: name, grade, avatar emoji
      │   └─→ Creates new student in Firestore
      │       └─→ Generates unique 6-digit code
      └─→ Logout button → signOut() → redirect to /login
```

## Authentication Service Flow

```typescript
handleRedirectLogin() {
  1. Wait for Firebase to initialize
  2. Call getRedirectResult()
     ├─→ If redirect found → return user
     └─→ If no redirect:
         └─→ Check auth.currentUser
             ├─→ If user exists → return user
             └─→ If no user → return null
}

startGoogleRedirectLogin() {
  1. Call signInWithRedirect(auth, googleProvider)
  2. Browser redirects to Google
  3. After auth → Google redirects back to app
  4. App initializer catches with getRedirectResult()
  5. onAuthStateChanged fires with authenticated user
}
```

## Console Log Timeline

### Timeline 1: Fresh Login (First Time)
```
[App] App component initialized
[App] onAuthStateChanged callback - user: no user
[ParentLogin] Component initialized
[Auth] Handling redirect login...
[Auth] Waiting for Firebase auth initialization...
[Auth] Firebase auth initialized
[Auth] Checking redirect result...
[Auth] No redirect result (first login)
[Auth] No user found

↓ USER CLICKS "LOGIN WITH GOOGLE" ↓

[ParentLogin] Login with Google clicked
[Auth] Starting Google redirect login...
(browser redirects to Google)

↓ AFTER GOOGLE AUTH & REDIRECT BACK ↓

[Auth] Setting up Firebase init listener...
[Auth] Auth state changed: user@gmail.com
[Auth] Checking redirect result...
[Auth] Redirect result found, user: user@gmail.com
[ParentLogin] Auth state changed: user@gmail.com
[ParentLogin] Navigation succeeded
[ParentAuthGuard] Checking parent auth...
[ParentDashboard] Component initialized
[ParentDashboard] Loading dashboard...
[ParentDashboard] Parent profile loaded: user@gmail.com
[ParentDashboard] Students loaded: 0
```

### Timeline 2: Returning User (Browser Refresh)
```
[App] App component initialized
[App] onAuthStateChanged callback - user: user@gmail.com
[App] Current URL: /#/
[App] User on login page, redirecting to parent/dashboard
[ParentAuthGuard] Checking parent auth...
[Auth] Handling redirect login...
[Auth] User already signed in: user@gmail.com
[ParentDashboard] Component initialized
[ParentDashboard] Loading dashboard...
[ParentDashboard] Parent profile loaded: user@gmail.com
```

## Component Hierarchy

```
App (root)
├── RouterOutlet
│   ├── Welcome Page
│   ├── Login Selection
│   ├── Parent Login
│   │   ├── Google Button
│   │   └── Spinner (during auth)
│   └── Parent Dashboard (guarded)
│       ├── Profile Card
│       ├── Add Student Form
│       ├── Students List
│       ├── Unlock Materials Form
│       └── Logout Button
│
└── Auth Service (provided at root)
    ├── handleRedirectLogin()
    ├── startGoogleRedirectLogin()
    ├── logout()
    ├── onAuthStateChanged()
    ├── addStudentForParent()
    └── getParentProfile()
```

## Key Files & Responsibilities

### Authentication Flow
- `firebase.config.ts` - Firebase initialization, browserLocalPersistence
- `auth.service.ts` - All auth logic (login, logout, session restore)
- `app.config.ts` - APP_INITIALIZER to handle redirect on startup

### Components
- `app.ts` - Root component, auto-redirect on auth state change
- `parent-login.component.ts` - Login UI, triggers auth
- `parent-dashboard.component.ts` - Dashboard UI, manages students
- `parent-auth.guard.ts` - Route guard for protected pages

### Firestore Collections
```
/parents/{uid}
  - uid: string
  - email: string
  - createdAt: timestamp
  - subscriptionStatus: string
  - students: array of student IDs

/students/{studentId}
  - parentId: string
  - name: string
  - grade: string
  - avatar: string
  - loginCode: string (unique 6-digit)
  - masteryMap: object
  - createdAt: timestamp
```

## Error Handling

### At Each Step:
1. **Google Auth Fails**: Show error on login page
2. **Redirect Result Fails**: Fall back to checking auth.currentUser
3. **Profile Load Fails**: Show "Unable to load dashboard" error
4. **Add Student Fails**: Show "Unable to add student" error
5. **Guard Fails**: Redirect back to login page

All errors are logged to console with `[Component]` prefix for easy debugging.

## Performance Considerations

1. **Session Caching**: `sessionRestorePromise` prevents multiple auth checks
2. **Firebase Persistence**: `browserLocalPersistence` allows offline access
3. **Guard Optimization**: Guard only checks once per route navigation
4. **Lazy Loading**: Dashboard components load only when needed

## Security

✅ **Implemented:**
- Firebase Authentication with Google OAuth
- Route guards prevent unauthorized access
- Parent profile created on first login
- Session persistence with browser storage
- Firestore security rules (configured in Firebase)

⚠️ **To Implement:**
- Firestore security rules for parent-student relationship validation
- Student code validation on login
- Rate limiting on API calls
- CSRF protection if using traditional backend

