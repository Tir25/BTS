# Complete Supabase MCP Configuration Guide for Cursor

## 🎯 **Objective**
Configure Supabase MCP server to enable **full read and write operations** directly from Cursor, eliminating the need to go to Supabase dashboard for database operations.

## 🔍 **Current Issue Analysis**
Your Supabase MCP tool is currently in **read-only mode**, preventing:
- ❌ INSERT operations
- ❌ UPDATE operations  
- ❌ DELETE operations
- ❌ Schema modifications
- ❌ Data migrations

## 🛠️ **Proper Configuration Implementation**

### **1. MCP Server Configuration (.cursor/mcp-servers.json)**

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
        "--access-token",
        "YOUR_SERVICE_ROLE_KEY_HERE",
        "--project-ref",
        "YOUR_PROJECT_REF_HERE"
      ]
    }
  }
}
```

### **2. Key Configuration Elements**

| Element | Purpose | Example |
|---------|---------|---------|
| `"command": "cmd"` | Windows command shell | Required for Windows compatibility |
| `"/c"` | Command execution flag | Windows-specific requirement |
| `--access-token` | Authentication token | Must be service role key for write access |
| `--project-ref` | Project identifier | Your Supabase project reference |

### **3. Authentication Token Types**

#### **Service Role Key (Recommended for MCP)**
- ✅ **Full database access** (bypasses RLS)
- ✅ **Write operations enabled**
- ✅ **Schema modifications allowed**
- ⚠️ **Bypasses security policies**

#### **Anonymous Key (Limited)**
- ❌ **Read-only operations only**
- ❌ **Subject to RLS policies**
- ❌ **No write permissions**

## 🔑 **Supabase Configuration Requirements**

### **1. Database Permissions**
Ensure your database user has proper permissions:

```sql
-- Check current user permissions
SELECT current_user, session_user;

-- Verify write permissions
SELECT has_table_privilege('public.system_constants', 'INSERT');
SELECT has_table_privilege('public.system_constants', 'UPDATE');
SELECT has_table_privilege('public.system_constants', 'DELETE');
```

### **2. Row Level Security (RLS)**
- **Tables with RLS enabled**: May require specific policies for write access
- **Tables without RLS**: Full access with service role key
- **Custom policies**: May need to be configured for your use case

### **3. Connection Pool Settings**
```sql
-- Check connection settings
SHOW max_connections;
SHOW shared_preload_libraries;

-- Verify PostGIS extension (for geometry data)
SELECT * FROM pg_extension WHERE extname = 'postgis';
```

## 🚀 **Step-by-Step Implementation**

### **Step 1: Update MCP Configuration**
1. Edit `.cursor/mcp-servers.json`
2. Use the configuration above
3. Replace with your actual service role key and project ref

### **Step 2: Restart Cursor Completely**
1. Close Cursor (including background processes)
2. Wait 30-45 seconds
3. Restart Cursor fresh

### **Step 3: Test Write Operations**
```sql
-- Test INSERT
INSERT INTO system_constants (constant_name, constant_value, description) 
VALUES ('mcp_test', '{"status": "success"}', 'Testing MCP write access') 
RETURNING id, constant_name;

-- Test UPDATE
UPDATE system_constants 
SET description = 'Updated via MCP' 
WHERE constant_name = 'mcp_test';

-- Test DELETE
DELETE FROM system_constants 
WHERE constant_name = 'mcp_test';
```

## 🔧 **Troubleshooting Guide**

### **Issue 1: Still Read-Only After Configuration**
**Symptoms**: `ERROR: 25006: cannot execute INSERT in a read-only transaction`

**Solutions**:
1. **Complete restart**: Close Cursor completely, wait, restart
2. **Check token**: Ensure service role key is correct
3. **Verify project ref**: Confirm project reference ID
4. **Clear cache**: Delete any cached MCP configurations

### **Issue 2: Permission Denied Errors**
**Symptoms**: `ERROR: permission denied for table`

**Solutions**:
1. **Use service role key**: Anonymous keys have limited permissions
2. **Check RLS policies**: Tables with RLS may need specific policies
3. **Verify database user**: Ensure proper database permissions

### **Issue 3: Connection Failures**
**Symptoms**: Connection timeout or authentication errors

**Solutions**:
1. **Check network**: Ensure internet connection is stable
2. **Verify token**: Check if service role key is valid
3. **Project status**: Confirm Supabase project is active

## 📊 **Expected Results After Proper Configuration**

### **✅ What Should Work:**
- **Read Operations**: All existing functionality
- **Write Operations**: INSERT, UPDATE, DELETE
- **Schema Operations**: Table creation, modification
- **Data Management**: Full CRUD operations
- **Real-time Queries**: Live data updates

### **🔒 Security Considerations:**
- **Service role key bypasses RLS**: Use with caution
- **Full database access**: Monitor operations carefully
- **Development environment**: Recommended for development/staging
- **Production caution**: Implement proper access controls

## 🧪 **Testing Protocol**

### **Phase 1: Basic Operations**
```sql
-- Test basic write operations
INSERT INTO system_constants (constant_name, constant_value, description) 
VALUES ('test_phase1', '{"phase": 1}', 'Phase 1 testing') 
RETURNING *;
```

### **Phase 2: Complex Operations**
```sql
-- Test complex data operations
INSERT INTO live_locations (bus_id, location, speed_kmh, heading_degrees)
VALUES (
  gen_random_uuid(),
  ST_GeomFromText('POINT(72.8777 19.0760)'),
  45.5,
  90.0
) RETURNING id, bus_id, ST_AsText(location);
```

### **Phase 3: Schema Operations**
```sql
-- Test schema modifications (if needed)
ALTER TABLE system_constants ADD COLUMN IF NOT EXISTS test_column TEXT;
```

## 📚 **Additional Resources**

### **Official Documentation:**
- [Supabase MCP Server](https://github.com/supabase-community/supabase-mcp)
- [Supabase Database Permissions](https://supabase.com/docs/guides/auth/row-level-security)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

### **Community Support:**
- Supabase Community Discord
- GitHub Issues for MCP server
- Stack Overflow with Supabase tags

## 🎯 **Success Criteria**

Your Supabase MCP tool is properly configured when you can:

1. ✅ **Read data** from any table
2. ✅ **Insert new records** into tables
3. ✅ **Update existing records** in tables
4. ✅ **Delete records** from tables
5. ✅ **Execute complex SQL queries** with write operations
6. ✅ **Manage database schema** if needed

## 🚨 **Important Notes**

- **Service Role Key**: Provides full database access, use responsibly
- **Development Environment**: Recommended for testing and development
- **Production Use**: Implement proper access controls and monitoring
- **Regular Backups**: Maintain database backups before major operations
- **Audit Logging**: Monitor database changes through Supabase dashboard

## 🔄 **Next Steps**

1. **Apply the configuration** above
2. **Restart Cursor completely**
3. **Test write operations** using the provided SQL examples
4. **Verify all CRUD operations** are working
5. **Implement proper monitoring** for production use

By following this guide, you should achieve full read and write access to your Supabase database directly from Cursor through the MCP tool.



