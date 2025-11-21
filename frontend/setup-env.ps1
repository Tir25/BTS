# Environment Variables Setup Script (PowerShell)
# Run this script to create .env file with Supabase configuration

$envContent = @"
# Supabase Configuration
# Using the same Supabase project for all roles (isolation via storage keys)

# Admin Supabase (NEW - Required for admin panel)
VITE_ADMIN_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_ADMIN_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Driver Supabase
VITE_DRIVER_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_DRIVER_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Student Supabase
VITE_STUDENT_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_STUDENT_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Legacy (fallback, optional - for backward compatibility)
VITE_SUPABASE_URL=https://gthwmwfwvhyriygpcdlr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI

# Admin Emails (comma-separated list of admin email addresses)
VITE_ADMIN_EMAILS=tirthraval27@gmail.com
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

Write-Host '✅ .env file created successfully!' -ForegroundColor Green
Write-Host '📝 Please review the file and update VITE_ADMIN_EMAILS if needed' -ForegroundColor Yellow

