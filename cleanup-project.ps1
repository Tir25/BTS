# Project Cleanup Script
Write-Host "Starting Project Cleanup..." -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Create organized directory structure
Write-Host "`nCreating organized directory structure..." -ForegroundColor Yellow

# Create docs directory for documentation
if (!(Test-Path "docs")) {
    New-Item -ItemType Directory -Name "docs"
    Write-Host "Created docs/ directory" -ForegroundColor Green
}

# Create scripts directory for useful scripts
if (!(Test-Path "scripts")) {
    New-Item -ItemType Directory -Name "scripts"
    Write-Host "Created scripts/ directory" -ForegroundColor Green
}

# Create sql directory for database scripts
if (!(Test-Path "sql")) {
    New-Item -ItemType Directory -Name "sql"
    Write-Host "Created sql/ directory" -ForegroundColor Green
}

# Create temp directory for temporary files (to be deleted)
if (!(Test-Path "temp")) {
    New-Item -ItemType Directory -Name "temp"
    Write-Host "Created temp/ directory" -ForegroundColor Green
}

Write-Host "`nMoving temporary files to temp/ directory..." -ForegroundColor Yellow

# List of temporary files to be removed
$tempFiles = @(
    # Temporary test scripts
    "test-auth-complete.ps1",
    "test-auth-production-simple.ps1",
    "test-production-auth.ps1",
    "test-supabase-auth-simple.ps1",
    "test-supabase-auth.ps1",
    "test-auth-quick.ps1",
    "test-authentication-system.ps1",
    "test-live-map-integration.ps1",
    "test-complete-management-system.ps1",
    "test-admin-login-verification.ps1",
    "test-new-admin-authorization.ps1",
    "test-authorization-token.ps1",
    "test-image-display-comprehensive.ps1",
    "test-media-management.ps1",
    "test-phase6-simple.ps1",
    "test-storage-working.ps1",
    "test-phase6-complete.ps1",
    "test-storage-setup.sql",
    "comprehensive-system-diagnostic.ps1",
    "simple-system-check.ps1",
    "final-system-verification.ps1",
    "upload-diagnostic-test.ps1",
    "debug-storage-upload.ps1",
    "debug-upload-button.ps1",
    "fix-upload-response.ps1",
    "fix-image-display.ps1",
    "fix-media-upload-issues.ps1",
    "quick-fix-upload-button.ps1",
    "run-backend.ps1",
    "final-auth-verification.ps1",
    
    # Temporary fix files (already applied)
    "fix-tirth-profile-duplicate.sql",
    "update-tirth-existing-user.sql",
    "fix-backend-auth-issue.sql",
    "fix-rls-infinite-recursion.sql",
    "setup-tirth-admin-user-fixed.sql",
    "setup-tirth-admin-user.sql",
    "setup-admin-user-complete.sql",
    "create-admin-user.sql",
    "fix-admin-user-supabase.sql",
    "fix-admin-user-final.sql",
    "fix-new-admin-user-setup.sql",
    "complete-admin-login-fix.sql",
    "fix-admin-login-with-rls.sql",
    "fix-admin-login-final.sql",
    "reset-admin-password-simple.sql",
    "fix-media-upload-schema.sql",
    "comprehensive-image-fix.sql",
    "debug-image-urls.sql",
    "fix-existing-image-urls.sql",
    "verify-admin-user-setup.sql",
    "fix-users-rls-policies.sql",
    "fix-all-rls-policies.sql",
    "check-existing-policies.sql",
    "add-missing-policies.sql",
    "final-storage-setup.sql",
    "setup-storage-policies-only.sql",
    "update-bucket-to-private.sql",
    
    # Temporary documentation (superseded)
    "AUTHENTICATION_SYSTEM_FIXES.md",
    "ADMIN_LOGIN_COMPLETE_TROUBLESHOOTING.md",
    "ADMIN_LOGIN_FINAL_FIX.md",
    "ADMIN_LOGIN_FIX_GUIDE.md",
    "fix-authorization-token-issue.md",
    "fix-file-conflict-error.md",
    "debug-storage-upload-error.md",
    "fix-upload-response-issue.md",
    "fix-bucket-not-found-issue.md",
    "fix-image-display-issue.md",
    "NEW_ADMIN_USER_COMPLETE_GUIDE.md",
    "MEDIA_UPLOAD_FIXES_SUMMARY.md",
    "fix-upload-button-issue.md",
    "UPLOAD_SYSTEM_ANALYSIS.md",
    "PHASE6_COMPLETE_SUMMARY.md",
    "COMPREHENSIVE_SYSTEM_ANALYSIS.md",
    "FINAL_TESTING_GUIDE.md",
    "PHASE6_MEDIA_MANAGEMENT_COMPLETE.md",
    "PHASE6_COMPLETE_SOLUTION.md",
    "PHASE6_PRIVATE_STORAGE_SETUP_GUIDE.md",
    "PHASE6_IMPLEMENTATION_SUMMARY.md",
    
    # Temporary API script
    "create-admin-via-api.js"
)

# Move temporary files to temp directory
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Move-Item $file "temp/"
        Write-Host "Moved $file to temp/" -ForegroundColor Blue
    }
}

Write-Host "`nMoving documentation to docs/ directory..." -ForegroundColor Yellow

# List of documentation files to keep
$docsFiles = @(
    "PRODUCTION_DEPLOYMENT_GUIDE.md",
    "SUPABASE_AUTH_IMPLEMENTATION.md",
    "LIVE_MAP_INTEGRATION_GUIDE.md",
    "COMPLETE_MANAGEMENT_SYSTEM_IMPLEMENTATION.md",
    "ADMIN_DASHBOARD_DETAILED_REPORT.md"
)

foreach ($file in $docsFiles) {
    if (Test-Path $file) {
        Move-Item $file "docs/"
        Write-Host "Moved $file to docs/" -ForegroundColor Blue
    }
}

Write-Host "`nMoving SQL scripts to sql/ directory..." -ForegroundColor Yellow

# List of SQL files to keep
$sqlFiles = @(
    "setup-production-auth.sql",
    "create-profiles-table.sql",
    "production-rls-policies.sql",
    "production-environment-setup.sql",
    "make-bucket-public.sql",
    "check-and-create-bucket.sql",
    "supabase-storage-policies.sql",
    "setup-supabase-storage.sql"
)

foreach ($file in $sqlFiles) {
    if (Test-Path $file) {
        Move-Item $file "sql/"
        Write-Host "Moved $file to sql/" -ForegroundColor Blue
    }
}

Write-Host "`nCreating README.md with project overview..." -ForegroundColor Yellow

# Create a comprehensive README
$readmeContent = @"
# University Bus Tracking System

A comprehensive bus tracking system with real-time location tracking, admin dashboard, and role-based authentication.

## Project Structure

\`\`\`
├── frontend/                 # React frontend application
├── backend/                  # Node.js backend API
├── docs/                     # Project documentation
├── sql/                      # Database scripts and migrations
├── scripts/                  # Utility scripts
└── temp/                     # Temporary files (to be deleted)
\`\`\`

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Supabase account
- Git

### Installation
1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   \`\`\`

3. Set up environment variables (see docs/PRODUCTION_DEPLOYMENT_GUIDE.md)

4. Run the development servers:
   \`\`\`bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   \`\`\`

## Authentication

The system uses Supabase Authentication with role-based access:
- **Admin**: Full system access
- **Driver**: Location updates and route management
- **Student**: View-only access to bus locations

### Default Admin Credentials
- Email: tirthraval27@gmail.com
- Password: Tirth Raval27

## Documentation

- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Supabase Authentication Implementation](docs/SUPABASE_AUTH_IMPLEMENTATION.md)
- [Live Map Integration Guide](docs/LIVE_MAP_INTEGRATION_GUIDE.md)
- [Management System Implementation](docs/COMPLETE_MANAGEMENT_SYSTEM_IMPLEMENTATION.md)

## Database

The system uses Supabase (PostgreSQL) with the following main tables:
- \`profiles\` - User profiles and roles
- \`buses\` - Bus information
- \`routes\` - Bus routes
- \`live_locations\` - Real-time bus locations
- \`users\` - User management

## Features

- Real-time bus tracking
- Admin dashboard
- Role-based authentication
- Media upload and management
- Live map integration
- CRUD operations for buses, routes, and drivers
- Production-ready deployment

## Monitoring

- Supabase Dashboard for database monitoring
- Real-time authentication logs
- Performance monitoring
- Error tracking

## Development

### Frontend
- React with TypeScript
- Vite for build tooling
- Leaflet for maps
- Supabase client for authentication

### Backend
- Node.js with Express
- TypeScript
- Supabase integration
- WebSocket for real-time updates

## Deployment

See [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## License

This project is part of a university assignment.

## Contributing

This is a university project. For questions or issues, contact the development team.
"@

$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8
Write-Host "Created README.md" -ForegroundColor Green

Write-Host "`nCleaning up temp directory..." -ForegroundColor Yellow
if (Test-Path "temp") {
    Remove-Item "temp" -Recurse -Force
    Write-Host "Removed temp/ directory and all temporary files" -ForegroundColor Green
}

Write-Host "`nCleanup Summary:" -ForegroundColor Yellow
Write-Host "Moved documentation to docs/" -ForegroundColor Green
Write-Host "Moved SQL scripts to sql/" -ForegroundColor Green
Write-Host "Removed temporary files and scripts" -ForegroundColor Green
Write-Host "Created comprehensive README.md" -ForegroundColor Green
Write-Host "Organized project structure" -ForegroundColor Green

Write-Host "`nProject cleanup completed!" -ForegroundColor Green
Write-Host "Your project is now organized and ready for production!" -ForegroundColor Green
