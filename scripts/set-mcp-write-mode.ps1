# Set MCP Write Mode Environment Variables
Write-Host "Setting MCP Write Mode Environment Variables..." -ForegroundColor Green

# Set environment variables for current session
$env:SUPABASE_MCP_READ_ONLY = "false"
$env:SUPABASE_MCP_WRITE_MODE = "true"

Write-Host "Environment variables set:" -ForegroundColor Cyan
Write-Host "SUPABASE_MCP_READ_ONLY = $env:SUPABASE_MCP_READ_ONLY" -ForegroundColor White
Write-Host "SUPABASE_MCP_WRITE_MODE = $env:SUPABASE_MCP_WRITE_MODE" -ForegroundColor White

Write-Host "`nTo make these permanent:" -ForegroundColor Yellow
Write-Host "1. Open System Properties > Environment Variables" -ForegroundColor White
Write-Host "2. Add these variables to your user environment" -ForegroundColor White
Write-Host "3. Restart Cursor/VS Code completely" -ForegroundColor White

Write-Host "`nCurrent MCP Configuration:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Get-Content "correct-mcp-config.json" | Write-Host

