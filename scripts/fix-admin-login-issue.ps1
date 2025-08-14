# Fix Admin Login Issue Script
# This script diagnoses and fixes admin authentication problems

Write-Host "🔧 Diagnosing Admin Login Issue..." -ForegroundColor Green

# Step 1: Check environment variables
Write-Host "📋 Step 1: Checking environment variables..." -ForegroundColor Yellow
Write-Host "Please verify your frontend/.env file contains:" -ForegroundColor Cyan
Write-Host ""
Write-Host "VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co" -ForegroundColor White
Write-Host "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI" -ForegroundColor White
Write-Host ""

# Step 2: Check admin user in database
Write-Host "👤 Step 2: Admin user verification..." -ForegroundColor Yellow
Write-Host "Admin user exists in database:" -ForegroundColor Cyan
Write-Host "  Email: admin@university.edu" -ForegroundColor White
Write-Host "  Role: admin" -ForegroundColor White
Write-Host ""

# Step 3: Reset admin password
Write-Host "🔐 Step 3: Resetting admin password..." -ForegroundColor Yellow
Write-Host "Run the following SQL in your Supabase SQL Editor to reset the admin password:" -ForegroundColor Cyan
Write-Host ""
Write-Host "--- SQL to reset admin password ---" -ForegroundColor Magenta
Write-Host "UPDATE auth.users SET encrypted_password = crypt('password', gen_salt('bf')) WHERE email = 'admin@university.edu';" -ForegroundColor White
Write-Host "--- End SQL ---" -ForegroundColor Magenta
Write-Host ""

# Step 4: Test login credentials
Write-Host "🧪 Step 4: Test login credentials..." -ForegroundColor Yellow
Write-Host "Try logging in with these credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@university.edu" -ForegroundColor White
Write-Host "  Password: password" -ForegroundColor White
Write-Host ""

# Step 5: Check browser console
Write-Host "🔍 Step 5: Debugging steps..." -ForegroundColor Yellow
Write-Host "1. Open browser developer tools (F12)" -ForegroundColor Cyan
Write-Host "2. Go to Console tab" -ForegroundColor Cyan
Write-Host "3. Try to login and check for error messages" -ForegroundColor Cyan
Write-Host "4. Look for any Supabase authentication errors" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Diagnostic script completed!" -ForegroundColor Green
Write-Host "If issues persist, check the browser console for specific error messages." -ForegroundColor Cyan
