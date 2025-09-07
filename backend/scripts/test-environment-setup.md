# 🧪 Test Environment Setup for Database Optimization

## 🎯 Purpose
Create a safe testing environment to validate all database changes before applying them to production.

## 🏗️ Test Environment Options

### Option 1: Supabase Branch (Recommended)
```bash
# Create a development branch in Supabase
# This gives you a fresh database with the same schema
# No risk to production data
```

### Option 2: Local PostgreSQL with Supabase Schema
```bash
# Install PostgreSQL locally
# Import production schema
# Test all changes locally
```

### Option 3: Docker Container
```bash
# Use Docker to create isolated test database
docker run --name test-postgres \
  -e POSTGRES_PASSWORD=test123 \
  -e POSTGRES_DB=bus_tracking_test \
  -p 5433:5432 \
  -d postgres:15
```

## 🔧 Test Environment Configuration

### Environment Variables for Testing
```bash
# backend/.env.test
NODE_ENV=test
PORT=3001
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_ANON_KEY=your_test_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key
DATABASE_URL=postgresql://postgres:test123@localhost:5433/bus_tracking_test
```

### Test Database Connection
```typescript
// backend/src/config/database.test.ts
import { Pool } from 'pg';

const testPool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'bus_tracking_test',
  user: 'postgres',
  password: 'test123',
});

export default testPool;
```

## 📊 Test Data Setup

### Sample Data for Testing
```sql
-- Insert test data for each table
INSERT INTO test_users (id, email, role, first_name, last_name) VALUES
('test-user-1', 'test1@example.com', 'admin', 'Test', 'Admin'),
('test-user-2', 'test2@example.com', 'driver', 'Test', 'Driver'),
('test-user-3', 'test3@example.com', 'student', 'Test', 'Student');

INSERT INTO test_profiles (id, full_name, role) VALUES
('test-user-1', 'Test Admin', 'admin'),
('test-user-2', 'Test Driver', 'driver'),
('test-user-3', 'Test Student', 'student');

INSERT INTO test_buses (id, code, number_plate, capacity) VALUES
('test-bus-1', 'TB001', 'TEST001', 50),
('test-bus-2', 'TB002', 'TEST002', 45);

INSERT INTO test_routes (id, name, description) VALUES
('test-route-1', 'Test Route 1', 'Test route description'),
('test-route-2', 'Test Route 2', 'Another test route');

INSERT INTO test_live_locations (id, bus_id, location, recorded_at) VALUES
('test-loc-1', 'test-bus-1', ST_GeomFromText('POINT(72.8777 23.0225)'), NOW()),
('test-loc-2', 'test-bus-2', ST_GeomFromText('POINT(72.8778 23.0226)'), NOW());
```

## 🧪 Testing Procedures

### 1. Schema Validation Tests
```typescript
// backend/tests/schema.test.ts
describe('Database Schema Tests', () => {
  test('All required tables exist', async () => {
    const tables = ['users', 'profiles', 'buses', 'routes', 'live_locations'];
    for (const table of tables) {
      const result = await testPool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
        [table]
      );
      expect(result.rows[0].exists).toBe(true);
    }
  });

  test('Foreign key constraints work', async () => {
    // Test that bus_id in live_locations references valid buses
    const result = await testPool.query(`
      SELECT COUNT(*) as invalid_references
      FROM test_live_locations ll
      LEFT JOIN test_buses b ON ll.bus_id = b.id
      WHERE b.id IS NULL
    `);
    expect(parseInt(result.rows[0].invalid_references)).toBe(0);
  });
});
```

### 2. Data Integrity Tests
```typescript
// backend/tests/data-integrity.test.ts
describe('Data Integrity Tests', () => {
  test('No orphaned records', async () => {
    // Test that all live_locations have valid bus references
    const result = await testPool.query(`
      SELECT COUNT(*) as orphaned_locations
      FROM test_live_locations ll
      LEFT JOIN test_buses b ON ll.bus_id = b.id
      WHERE b.id IS NULL
    `);
    expect(parseInt(result.rows[0].orphaned_locations)).toBe(0);
  });

  test('Spatial data is valid', async () => {
    // Test that all location data is valid PostGIS geometry
    const result = await testPool.query(`
      SELECT COUNT(*) as invalid_geometry
      FROM test_live_locations
      WHERE NOT ST_IsValid(location)
    `);
    expect(parseInt(result.rows[0].invalid_geometry)).toBe(0);
  });
});
```

### 3. Performance Tests
```typescript
// backend/tests/performance.test.ts
describe('Performance Tests', () => {
  test('Location queries are fast', async () => {
    const start = Date.now();
    await testPool.query(`
      SELECT * FROM test_live_locations 
      WHERE ST_DWithin(location, ST_GeomFromText('POINT(72.8777 23.0225)'), 0.01)
      ORDER BY recorded_at DESC
      LIMIT 100
    `);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
  });
});
```

## 🚨 Test Environment Safety

### Isolation
- Test environment is completely separate from production
- No production data is accessed during testing
- All tests use mock/sample data

### Cleanup
```bash
# After testing, clean up test environment
docker stop test-postgres
docker rm test-postgres

# Or drop test database
DROP DATABASE IF EXISTS bus_tracking_test;
```

### Validation
- All tests must pass before proceeding to production
- Performance benchmarks must be met
- Data integrity must be verified

## 📋 Test Checklist

- [ ] Test environment created and configured
- [ ] Sample data inserted
- [ ] All schema tests pass
- [ ] All data integrity tests pass
- [ ] All performance tests pass
- [ ] Rollback procedures tested
- [ ] Test environment cleaned up

## 🔄 Next Steps

1. Set up test environment
2. Run all tests
3. Document any issues
4. Fix issues in test environment
5. Re-run tests until all pass
6. Proceed to production changes
