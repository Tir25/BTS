# Restart MCP Server with Write Permissions
Write-Host "Restarting MCP Server with Write Permissions..." -ForegroundColor Green

# Check if Cursor/VS Code is running
$cursorProcesses = Get-Process | Where-Object { $_.ProcessName -like "*cursor*" -or $_.ProcessName -like "*code*" }
if ($cursorProcesses) {
    Write-Host "Found running Cursor/VS Code processes:" -ForegroundColor Yellow
    $cursorProcesses | ForEach-Object { Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" }
    
    Write-Host "`nTo enable write permissions:" -ForegroundColor Cyan
    Write-Host "1. Close Cursor/VS Code completely" -ForegroundColor White
    Write-Host "2. Copy the updated MCP configuration:" -ForegroundColor White
    Write-Host "3. Reopen Cursor/VS Code" -ForegroundColor White
    Write-Host "4. Wait for MCP server to reconnect" -ForegroundColor White
} else {
    Write-Host "No Cursor/VS Code processes found running." -ForegroundColor Yellow
}

Write-Host "`nUpdated MCP Configuration:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Get-Content "correct-mcp-config.json" | Write-Host

Write-Host "`nAlternative Configuration (mcp-config-write-mode.json):" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Get-Content "mcp-config-write-mode.json" | Write-Host

Write-Host "`nNext Steps:" -ForegroundColor Green
Write-Host "===========" -ForegroundColor Green
Write-Host "1. Close Cursor/VS Code completely" -ForegroundColor White
Write-Host "2. Reopen Cursor/VS Code" -ForegroundColor White
Write-Host "3. Wait for MCP server to reconnect" -ForegroundColor White
Write-Host "4. Test write permissions with: mcp_supabase_execute_sql" -ForegroundColor White

