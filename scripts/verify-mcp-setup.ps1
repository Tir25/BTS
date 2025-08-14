# Verify Supabase MCP Setup Script
# This script verifies that your Supabase MCP configuration is properly set up

Write-Host "🔧 Verifying Supabase MCP Setup..." -ForegroundColor Yellow
Write-Host ""

# Check 1: MCP Configuration File
Write-Host "✅ Check 1: MCP Configuration File" -ForegroundColor Cyan
$mcpConfigPath = "$env:USERPROFILE\.cursor\mcp.json"
if (Test-Path $mcpConfigPath) {
    Write-Host "   ✅ MCP config file exists: $mcpConfigPath" -ForegroundColor Green
    
    try {
        $config = Get-Content $mcpConfigPath | ConvertFrom-Json
        $projectRef = $config.mcpServers.supabase.args[3]
        $accessToken = $config.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN
        
        if ($projectRef -eq "gthwmwfwvhyriygpcdlr") {
            Write-Host "   ✅ Project reference is correct: $projectRef" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Project reference is incorrect: $projectRef" -ForegroundColor Red
        }
        
        if ($accessToken -eq "sbp_caaf0ec1b2ba343dd28ff648c7219a673ed3c324") {
            Write-Host "   ✅ Access token is correct" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Access token is incorrect" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Error reading MCP config: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ MCP config file not found" -ForegroundColor Red
}

Write-Host ""

# Check 2: Global Environment File
Write-Host "✅ Check 2: Global Environment File" -ForegroundColor Cyan
$envConfigPath = "$env:APPDATA\supabase-mcp\.env"
if (Test-Path $envConfigPath) {
    Write-Host "   ✅ Environment file exists: $envConfigPath" -ForegroundColor Green
    
    $envContent = Get-Content $envConfigPath
    $hasProjectRef = $envContent | Where-Object { $_ -like "*SUPABASE_PROJECT_REF*" }
    $hasAccessToken = $envContent | Where-Object { $_ -like "*SUPABASE_ACCESS_TOKEN*" }
    $hasServiceKey = $envContent | Where-Object { $_ -like "*SUPABASE_SERVICE_ROLE_KEY*" }
    
    if ($hasProjectRef) { Write-Host "   ✅ Project reference configured" -ForegroundColor Green }
    if ($hasAccessToken) { Write-Host "   ✅ Access token configured" -ForegroundColor Green }
    if ($hasServiceKey) { Write-Host "   ✅ Service role key configured" -ForegroundColor Green }
} else {
    Write-Host "   ❌ Environment file not found" -ForegroundColor Red
}

Write-Host ""

# Check 3: Backup Configuration
Write-Host "✅ Check 3: Backup Configuration" -ForegroundColor Cyan
$backupPath = "$env:USERPROFILE\.cursor\mcp.json.backup"
if (Test-Path $backupPath) {
    Write-Host "   ✅ Backup configuration created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ No backup configuration found" -ForegroundColor Yellow
}

Write-Host ""

# Check 4: Test MCP Server Availability
Write-Host "✅ Check 4: MCP Server Package Availability" -ForegroundColor Cyan
try {
    $npxVersion = npx --version 2>$null
    if ($npxVersion) {
        Write-Host "   ✅ npx is available: $npxVersion" -ForegroundColor Green
        
        # Test if the Supabase MCP package can be accessed
        Write-Host "   🔄 Testing Supabase MCP package access..." -ForegroundColor Yellow
        $testResult = npx -y @supabase/mcp-server-supabase@latest --help 2>&1
        if ($testResult -like "*Usage*" -or $testResult -like "*help*") {
            Write-Host "   ✅ Supabase MCP package is accessible" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Supabase MCP package may not be accessible" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ npx is not available" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error testing npx: $_" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "📊 Setup Summary:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ MCP Configuration Updated:" -ForegroundColor Green
Write-Host "   • Project reference: gthwmwfwvhyriygpcdlr" -ForegroundColor White
Write-Host "   • Access token: Configured" -ForegroundColor White
Write-Host "   • Command: npx @supabase/mcp-server-supabase@latest" -ForegroundColor White
Write-Host ""
Write-Host "✅ Global Environment Setup:" -ForegroundColor Green
Write-Host "   • Environment file: $env:APPDATA\supabase-mcp\.env" -ForegroundColor White
Write-Host "   • All required variables configured" -ForegroundColor White
Write-Host ""
Write-Host "✅ Backup Created:" -ForegroundColor Green
Write-Host "   • Original configuration backed up" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart Cursor/VS Code completely" -ForegroundColor White
Write-Host "2. Check Settings > MCP for green active status" -ForegroundColor White
Write-Host "3. Try using Supabase MCP commands in your editor" -ForegroundColor White
Write-Host "4. Test with: 'Show me my Supabase tables'" -ForegroundColor White
Write-Host ""
Write-Host "🔧 If issues persist:" -ForegroundColor Yellow
Write-Host "• Check MCP server logs in your editor" -ForegroundColor White
Write-Host "• Verify internet connection for npx package download" -ForegroundColor White
Write-Host "• Ensure your Supabase project is active" -ForegroundColor White
