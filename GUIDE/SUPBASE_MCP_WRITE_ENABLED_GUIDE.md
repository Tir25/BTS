# Supabase MCP Tool - Write Operations Enablement Guide

## Overview
This guide explains how to configure the Supabase MCP (Model Context Protocol) tool to enable read and write operations instead of being limited to read-only mode.

## Current Status
✅ **READ-ONLY MODE**: The MCP tool can currently only read data from your Supabase database
❌ **WRITE OPERATIONS**: Cannot perform INSERT, UPDATE, DELETE operations

## Configuration Changes Made

### 1. Main Configuration (.cursor/mcp-servers.json)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=gthwmwfwvhyriygpcdlr",
        "--write-enabled",           // ← NEW: Enables write operations
        "--no-read-only"            // ← NEW: Disables read-only mode
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-token-here",
        "SUPABASE_WRITE_ENABLED": "true",    // ← NEW: Environment variable
        "MCP_READ_ONLY": "false"            // ← NEW: Environment variable
      }
    }
  }
}
```

### 2. Windows Configuration (.cursor/mcp-servers-windows.json)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=gthwmwfwvhyriygpcdlr",
        "--write-enabled",           // ← NEW: Enables write operations
        "--no-read-only"            // ← NEW: Disables read-only mode
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-token-here",
        "SUPABASE_WRITE_ENABLED": "true",    // ← NEW: Environment variable
        "MCP_READ_ONLY": "false"            // ← NEW: Environment variable
      }
    }
  }
}
```

## Key Configuration Flags

| Flag | Purpose | Description |
|------|---------|-------------|
| `--write-enabled` | Enables write operations | Allows INSERT, UPDATE, DELETE operations |
| `--no-read-only` | Disables read-only mode | Removes read-only transaction restrictions |
| `--project-ref` | Project scope | Limits access to specific Supabase project |

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `SUPABASE_WRITE_ENABLED` | `"true"` | Enables write capabilities at environment level |
| `MCP_READ_ONLY` | `"false"` | Disables read-only mode at MCP level |

## Security Considerations

⚠️ **IMPORTANT**: Enabling write operations increases security risk

### Best Practices:
1. **Use Service Role Key**: Consider using `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY`
2. **Limit Access**: Ensure MCP tool is only accessible to authorized developers
3. **Development Environment**: Use write-enabled MCP primarily in development/staging
4. **Audit Logs**: Monitor database changes through Supabase dashboard
5. **Backup Strategy**: Maintain regular database backups before major operations

### Recommended Service Role Configuration:
```json
"env": {
  "SUPABASE_ACCESS_TOKEN": "your-service-role-key-here",
  "SUPABASE_WRITE_ENABLED": "true",
  "MCP_READ_ONLY": "false"
}
```

## Verification Steps

### 1. Restart Cursor
After making configuration changes, restart Cursor to apply new MCP settings.

### 2. Test Write Operations
Try a simple INSERT operation:
```sql
INSERT INTO system_constants (constant_name, constant_value, description) 
VALUES ('mcp_test', '{"test": true}', 'Test record for MCP write operations') 
RETURNING id, constant_name;
```

### 3. Expected Results
- **Before**: `ERROR: 25006: cannot execute INSERT in a read-only transaction`
- **After**: Successful insertion with returned record

## Troubleshooting

### Common Issues:

1. **Still Read-Only After Restart**
   - Check if multiple MCP config files exist
   - Ensure correct file is being used by Cursor
   - Verify flag syntax and spelling

2. **Permission Denied Errors**
   - Check if access token has sufficient permissions
   - Verify project reference ID is correct
   - Ensure database user has write privileges

3. **Configuration Not Applied**
   - Restart Cursor completely
   - Check file permissions
   - Verify JSON syntax is valid

### Debug Commands:
```bash
# Check MCP server version
npx @supabase/mcp-server-supabase@latest --version

# Test direct connection
npx @supabase/mcp-server-supabase@latest --project-ref=gthwmwfwvhyriygpcdlr --write-enabled --no-read-only
```

## Next Steps

1. **Restart Cursor** to apply configuration changes
2. **Test write operations** with simple INSERT statements
3. **Verify database changes** in Supabase dashboard
4. **Implement proper error handling** in your application
5. **Set up monitoring** for database operations

## Additional Resources

- [Supabase MCP Server Documentation](https://github.com/supabase-community/supabase-mcp)
- [Supabase Database Permissions](https://supabase.com/docs/guides/auth/row-level-security)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

## Support

If you encounter issues:
1. Check Supabase project logs
2. Verify MCP server configuration
3. Test with minimal configuration first
4. Consult Supabase community forums
