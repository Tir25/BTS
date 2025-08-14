# Test Supabase MCP Configuration Script
# This script tests if your Supabase MCP configuration is working correctly

Write-Host "🔧 Testing Supabase MCP Configuration..." -ForegroundColor Yellow
Write-Host ""

# Set environment variables
$env:SUPABASE_ACCESS_TOKEN = "sbp_caaf0ec1b2ba343dd28ff648c7219a673ed3c324"
$env:SUPABASE_PROJECT_REF = "gthwmwfwvhyriygpcdlr"

Write-Host "📋 Configuration Details:" -ForegroundColor Cyan
Write-Host "Project Reference: $env:SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host "Access Token: $($env:SUPABASE_ACCESS_TOKEN.Substring(0,10))..." -ForegroundColor White
Write-Host ""

# Test 1: Check if npx is available
Write-Host "🧪 Test 1: Checking npx availability..." -ForegroundColor Yellow
try {
    $npxVersion = npx --version 2>$null
    if ($npxVersion) {
        Write-Host "✅ npx is available: $npxVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ npx is not available" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ npx is not available" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Try to run the Supabase MCP server
Write-Host "🧪 Test 2: Testing Supabase MCP server..." -ForegroundColor Yellow
try {
    Write-Host "Attempting to start MCP server..." -ForegroundColor White
    
    # Start the MCP server in a background job
    $job = Start-Job -ScriptBlock {
        $env:SUPABASE_ACCESS_TOKEN = "sbp_caaf0ec1b2ba343dd28ff648c7219a673ed3c324"
        npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=gthwmwfwvhyriygpcdlr
    }
    
    # Wait a few seconds for the server to start
    Start-Sleep -Seconds 5
    
    # Check if the job is still running
    if ($job.State -eq "Running") {
        Write-Host "✅ Supabase MCP server started successfully!" -ForegroundColor Green
        Stop-Job $job
        Remove-Job $job
    } else {
        $result = Receive-Job $job
        Write-Host "❌ Failed to start MCP server:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Remove-Job $job
    }
} catch {
    Write-Host "❌ Error testing MCP server: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check current MCP configuration
Write-Host "🧪 Test 3: Checking current MCP configuration..." -ForegroundColor Yellow
$mcpConfigPath = "$env:USERPROFILE\.cursor\mcp.json"

if (Test-Path $mcpConfigPath) {
    Write-Host "✅ MCP configuration file found: $mcpConfigPath" -ForegroundColor Green
    
    try {
        $config = Get-Content $mcpConfigPath | ConvertFrom-Json
        Write-Host "Current configuration:" -ForegroundColor White
        Write-Host "  Project Reference: $($config.mcpServers.supabase.args[4])" -ForegroundColor White
        Write-Host "  Access Token: $($config.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN.Substring(0,10))..." -ForegroundColor White
        
        # Check if project reference is correct
        if ($config.mcpServers.supabase.args[4] -eq "gthwmwfwvhyriygpcdlr") {
            Write-Host "✅ Project reference is correct" -ForegroundColor Green
        } else {
            Write-Host "❌ Project reference is incorrect" -ForegroundColor Red
            Write-Host "   Expected: gthwmwfwvhyriygpcdlr" -ForegroundColor White
            Write-Host "   Found: $($config.mcpServers.supabase.args[4])" -ForegroundColor White
        }
    } catch {
        Write-Host "❌ Error reading MCP configuration: $_" -ForegroundColor Red
    }
} else {
    Write-Host "❌ MCP configuration file not found" -ForegroundColor Red
}

Write-Host ""

# Test 4: Test Supabase connection directly
Write-Host "🧪 Test 4: Testing direct Supabase connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://gthwmwfwvhyriygpcdlr.supabase.co/rest/v1/" -Headers @{
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI"
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aHdtd2Z3dmh5cml5Z3BjZGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzE0NTUsImV4cCI6MjA3MDU0NzQ1NX0.gY0ghDtKZ9b8XlgE7XtbQsT3efXYOBizGQKPJABGvAI"
    }
    Write-Host "✅ Direct Supabase connection successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Direct Supabase connection failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "If you see mostly ✅ green checkmarks, your Supabase MCP configuration is working correctly." -ForegroundColor White
Write-Host "If you see ❌ red X marks, there are issues that need to be resolved." -ForegroundColor White
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart Cursor/VS Code after fixing any configuration issues" -ForegroundColor White
Write-Host "2. Try using Supabase MCP commands in your editor" -ForegroundColor White
Write-Host "3. Check the MCP server logs for detailed error information" -ForegroundColor White
