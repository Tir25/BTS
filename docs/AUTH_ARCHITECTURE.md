# Multi-Role Authentication Architecture

## Overview

The Bus Tracking System uses a **role-based authentication architecture** with isolated Supabase clients for each role (Admin, Driver, Student). This prevents session bleeding and ensures proper security boundaries.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Admin Client │  │ Driver Client │  │Student Client │     │
│  │ (admin)      │  │ (driver)      │  │ (student)     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                  │
│                   ┌────────▼────────┐                        │
│                   │  Shared Helpers  │                        │
│                   │  - tokenStorage  │                        │
│                   │  - sessionHelpers│                        │
│                   │  - profileHelpers│                        │
│                   └─────────────────┘                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Role-Specific Auth Services                  │   │
│  │  - AdminAuthService (uses admin client)              │   │
│  │  - DriverAuthService (uses driver client)             │   │
│  │  - StudentAuthService (uses student client)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API                               │
├─────────────────────────────────────────────────────────────┤
│  - authenticateUser middleware (validates JWT)              │
│  - requireAdmin middleware (checks role)                      │
│  - Role-based route guards                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  - user_profiles (role: admin | driver | student)           │
│  - Separate auth tables per project (if using separate)      │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Supabase Client Instances

Each role has its own Supabase client with isolated storage:

- **Admin Client**: `getAdminSupabaseClient()`
  - Storage Key: `sb-{projectId}-admin-auth`
  - Environment: `VITE_ADMIN_SUPABASE_URL`, `VITE_ADMIN_SUPABASE_ANON_KEY`
  
- **Driver Client**: `getDriverSupabaseClient()`
  - Storage Key: `sb-{projectId}-driver-auth`
  - Environment: `VITE_DRIVER_SUPABASE_URL`, `VITE_DRIVER_SUPABASE_ANON_KEY`
  
- **Student Client**: `getStudentSupabaseClient()`
  - Storage Key: `sb-{projectId}-student-auth`
  - Environment: `VITE_STUDENT_SUPABASE_URL`, `VITE_STUDENT_SUPABASE_ANON_KEY`

### 2. Shared Helpers

These utilities are shared across all roles but operate on role-specific clients:

- **tokenStorage**: In-memory token cache with expiration
- **sessionHelpers**: Session refresh, validation, proactive refresh
- **profileHelpers**: User profile loading and caching
- **assignmentHelpers**: Driver-bus assignment management (driver-specific)

### 3. Role-Specific Auth Services

Each role has its own auth service instance that:
- Uses the appropriate Supabase client
- Manages role-specific state
- Provides role-specific methods

### 4. Context Providers

- **AdminAuthContext**: For admin panel (if needed)
- **DriverAuthContext**: For driver interface
- **StudentAuthContext**: For student map (if needed)

## Storage Isolation

Each client uses a unique `storageKey` in localStorage:

```typescript
storageKey: `sb-${projectId}-${role}-auth`
```

This ensures:
- Admin sessions don't interfere with driver sessions
- Driver sessions don't interfere with student sessions
- Each role can be logged in simultaneously in different tabs

## Migration Path

### Phase 1: Create Admin Client ✅
- Create `adminClient.ts` similar to `driverClient.ts` and `studentClient.ts`
- Add environment variables for admin Supabase config

### Phase 2: Update AuthService
- Make `authService` role-aware
- Add `getAuthService(role: 'admin' | 'driver' | 'student')` factory
- Update `AdminLogin` to use admin client

### Phase 3: Update Consumers
- Update all admin components to use admin auth service
- Add navigation guards to prevent role mixing
- Update contexts to use scoped services

### Phase 4: Cleanup
- Remove legacy `supabase` export
- Update all references to use role-specific clients
- Add migration warnings for deprecated code

## Navigation Guards

Each context/provider should include guards:

```typescript
// Driver context guard
if (currentRole !== 'driver') {
  navigate('/driver/login');
  return;
}

// Student context guard
if (currentRole !== 'student') {
  navigate('/student/login');
  return;
}
```

## Session Management

### Sign Out Flow

1. Stop proactive session refresh
2. Clear role-specific assignment cache (if driver)
3. Sign out from Supabase (role-specific client)
4. Clear all auth state
5. Clear token cache
6. Clear localStorage/sessionStorage (role-specific keys)
7. Notify listeners

### Session Recovery

Each role can recover its own session independently:
- Admin: `adminAuthService.recoverSession()`
- Driver: `driverAuthService.recoverSession()`
- Student: `studentAuthService.recoverSession()`

## Best Practices

1. **Always use role-specific clients**: Never use the legacy `supabase` export
2. **Clear sessions on role switch**: Sign out from current role before switching
3. **Use navigation guards**: Prevent unauthorized access to role-specific pages
4. **Isolate storage**: Each role has its own localStorage keys
5. **Shared helpers, scoped clients**: Helpers are shared, but operate on role-specific clients

## Environment Variables

```env
# Admin Supabase (new)
VITE_ADMIN_SUPABASE_URL=https://xxx.supabase.co
VITE_ADMIN_SUPABASE_ANON_KEY=xxx

# Driver Supabase
VITE_DRIVER_SUPABASE_URL=https://xxx.supabase.co
VITE_DRIVER_SUPABASE_ANON_KEY=xxx

# Student Supabase
VITE_STUDENT_SUPABASE_URL=https://xxx.supabase.co
VITE_STUDENT_SUPABASE_ANON_KEY=xxx

# Legacy (fallback, deprecated)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

