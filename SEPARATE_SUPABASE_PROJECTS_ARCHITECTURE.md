# Separate Supabase Projects Architecture
## Driver and Student Authentication Isolation

**Date:** 2025-01-27  
**Status:** Implementation Plan  
**Goal:** Complete isolation between driver and student authentication using separate Supabase projects

---

## 🎯 Architecture Overview

### Design Principles
1. **Complete Isolation:** Drivers and students use separate Supabase projects
2. **Modular Design:** Small, manageable components with clear responsibilities
3. **No Duplication:** Shared utilities and patterns, role-specific implementations
4. **Easy Debugging:** Clear logging and error handling
5. **Best Practices:** Type-safe, error-handled, well-documented code

---

## 📁 File Structure

### Backend Structure
```
backend/src/config/
├── supabase/
│   ├── index.ts                 # Main export - role-based client getters
│   ├── driverClient.ts          # Driver Supabase client factory
│   ├── studentClient.ts         # Student Supabase client factory
│   ├── clientFactory.ts         # Shared client creation logic
│   └── types.ts                 # Type definitions
├── environment.ts               # Updated to support dual projects
└── index.ts                     # Re-export with backward compatibility

backend/src/services/auth/
├── driverAuthService.ts         # Driver authentication service
├── studentAuthService.ts        # Student authentication service
└── baseAuthService.ts           # Shared authentication logic
```

### Frontend Structure
```
frontend/src/config/
├── supabase/
│   ├── index.ts                 # Main export - role-based client getters
│   ├── driverClient.ts          # Driver Supabase client factory
│   ├── studentClient.ts         # Student Supabase client factory
│   ├── clientFactory.ts         # Shared client creation logic
│   └── types.ts                 # Type definitions
├── environment.ts               # Updated to support dual projects
└── index.ts                     # Re-export

frontend/src/services/auth/
├── driverAuthService.ts         # Driver authentication service
├── studentAuthService.ts        # Student authentication service
└── baseAuthService.ts           # Shared authentication logic
```

---

## 🔧 Environment Variables

### Backend Environment Variables
```env
# Driver Supabase Project
DRIVER_SUPABASE_URL=https://driver-project.supabase.co
DRIVER_SUPABASE_ANON_KEY=driver_anon_key
DRIVER_SUPABASE_SERVICE_ROLE_KEY=driver_service_role_key

# Student Supabase Project
STUDENT_SUPABASE_URL=https://student-project.supabase.co
STUDENT_SUPABASE_ANON_KEY=student_anon_key
STUDENT_SUPABASE_SERVICE_ROLE_KEY=student_service_role_key

# Legacy (for backward compatibility during migration)
SUPABASE_URL=https://legacy-project.supabase.co
SUPABASE_ANON_KEY=legacy_anon_key
SUPABASE_SERVICE_ROLE_KEY=legacy_service_role_key
```

### Frontend Environment Variables
```env
# Driver Supabase Project
VITE_DRIVER_SUPABASE_URL=https://driver-project.supabase.co
VITE_DRIVER_SUPABASE_ANON_KEY=driver_anon_key

# Student Supabase Project
VITE_STUDENT_SUPABASE_URL=https://student-project.supabase.co
VITE_STUDENT_SUPABASE_ANON_KEY=student_anon_key

# Legacy (for backward compatibility during migration)
VITE_SUPABASE_URL=https://legacy-project.supabase.co
VITE_SUPABASE_ANON_KEY=legacy_anon_key
```

---

## 🏗️ Implementation Steps

### Phase 1: Configuration Layer
1. ✅ Create role-based Supabase client factories
2. ✅ Update environment configuration
3. ✅ Create type definitions
4. ✅ Add validation and error handling

### Phase 2: Backend Services
1. ✅ Create driver authentication service
2. ✅ Create student authentication service
3. ✅ Update auth routes to use role-specific clients
4. ✅ Implement student login endpoint

### Phase 3: Frontend Services
1. ✅ Create driver authentication service
2. ✅ Create student authentication service
3. ✅ Update components to use role-specific services
4. ✅ Update StudentLogin component

### Phase 4: Migration & Cleanup
1. ✅ Update all imports systematically
2. ✅ Remove old implementations
3. ✅ Update documentation
4. ✅ Test thoroughly

---

## 🔐 Authentication Flow

### Driver Authentication Flow
```
Driver Login Request
  → Backend: /auth/driver/login
  → Uses: driverSupabaseAdminClient
  → Authenticates: Driver Supabase Project
  → Returns: Driver session token
  → Frontend: Stores in driver session storage
```

### Student Authentication Flow
```
Student Login Request
  → Backend: /auth/student/login
  → Uses: studentSupabaseAdminClient
  → Authenticates: Student Supabase Project
  → Returns: Student session token
  → Frontend: Stores in student session storage
```

---

## 📦 Client Isolation

### Session Storage Keys
- **Driver:** `sb-{driver-project-id}-auth-token`
- **Student:** `sb-{student-project-id}-auth-token`
- **Complete Isolation:** Different localStorage keys, no conflicts

### Client Instances
- **Driver Client:** Separate Supabase client instance
- **Student Client:** Separate Supabase client instance
- **No Sharing:** Each role has its own client and session

---

## 🧪 Testing Strategy

### Unit Tests
- Client factory creation
- Environment variable validation
- Authentication service methods
- Error handling

### Integration Tests
- Driver login flow
- Student login flow
- Concurrent authentication
- Session isolation

### E2E Tests
- Driver can log in while student is logged in
- Student can log in while driver is logged in
- Sessions don't interfere with each other
- Logout doesn't affect other role

---

## 📝 Migration Checklist

### Backend
- [ ] Create role-based client factories
- [ ] Update environment configuration
- [ ] Create authentication services
- [ ] Update auth routes
- [ ] Update all Supabase imports
- [ ] Remove old supabase.ts
- [ ] Update tests

### Frontend
- [ ] Create role-based client factories
- [ ] Update environment configuration
- [ ] Create authentication services
- [ ] Update components
- [ ] Update all Supabase imports
- [ ] Remove old supabase.ts
- [ ] Update tests

### Documentation
- [ ] Update environment variable documentation
- [ ] Update API documentation
- [ ] Update setup guides
- [ ] Update deployment guides

---

## 🚀 Deployment Notes

### Supabase Projects Setup
1. Create driver Supabase project
2. Create student Supabase project
3. Configure environment variables
4. Set up database schemas (if needed)
5. Configure RLS policies
6. Test authentication flows

### Environment Configuration
1. Update backend .env files
2. Update frontend .env files
3. Update deployment platforms (Render, Vercel)
4. Test in staging environment
5. Deploy to production

---

## 🔍 Debugging Guide

### Common Issues
1. **Wrong Client Used:** Check role detection logic
2. **Session Conflicts:** Verify localStorage keys are different
3. **Environment Variables:** Check both driver and student configs
4. **Authentication Errors:** Check project-specific credentials

### Debug Tools
- Check localStorage keys: `Object.keys(localStorage).filter(k => k.includes('supabase'))`
- Verify client instances: `console.log(driverClient, studentClient)`
- Check environment: `console.log(environment.supabase)`
- Monitor network: Check which Supabase project is being called

---

## 📚 Code Examples

### Backend: Get Driver Client
```typescript
import { getDriverSupabaseAdmin } from '../config/supabase';

const driverClient = getDriverSupabaseAdmin();
const { data } = await driverClient.from('user_profiles').select('*');
```

### Backend: Get Student Client
```typescript
import { getStudentSupabaseAdmin } from '../config/supabase';

const studentClient = getStudentSupabaseAdmin();
const { data } = await studentClient.from('user_profiles').select('*');
```

### Frontend: Driver Authentication
```typescript
import { driverAuthService } from '../services/auth/driverAuthService';

const result = await driverAuthService.signIn(email, password);
```

### Frontend: Student Authentication
```typescript
import { studentAuthService } from '../services/auth/studentAuthService';

const result = await studentAuthService.signIn(email, password);
```

---

## ✅ Success Criteria

1. ✅ Drivers and students can log in simultaneously
2. ✅ No session conflicts between roles
3. ✅ Complete isolation between projects
4. ✅ All existing functionality works
5. ✅ Code is modular and maintainable
6. ✅ No duplicate implementations
7. ✅ Easy to debug and extend

---

**Status:** Ready for Implementation  
**Next Step:** Create configuration layer

