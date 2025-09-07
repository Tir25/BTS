"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
global.console = {
    ...console,
    warn: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
    log: vitest_1.vi.fn(),
};
vitest_1.vi.mock('../config/database', () => ({
    default: {
        query: vitest_1.vi.fn(),
        connect: vitest_1.vi.fn(),
        end: vitest_1.vi.fn(),
    },
    checkDatabaseHealth: vitest_1.vi.fn().mockResolvedValue({
        healthy: true,
        details: {
            status: 'connected',
            details: {
                currentTime: new Date().toISOString(),
                postgresVersion: '15.0',
                poolSize: 10,
                idleCount: 5,
                waitingCount: 0,
            },
        },
    }),
}));
vitest_1.vi.mock('@supabase/supabase-js', () => ({
    createClient: vitest_1.vi.fn().mockReturnValue({
        auth: {
            getUser: vitest_1.vi.fn(),
            signInWithPassword: vitest_1.vi.fn(),
            signOut: vitest_1.vi.fn(),
        },
        from: vitest_1.vi.fn().mockReturnValue({
            select: vitest_1.vi.fn().mockReturnThis(),
            insert: vitest_1.vi.fn().mockReturnThis(),
            update: vitest_1.vi.fn().mockReturnThis(),
            delete: vitest_1.vi.fn().mockReturnThis(),
            eq: vitest_1.vi.fn().mockReturnThis(),
            single: vitest_1.vi.fn(),
        }),
    }),
}));
vitest_1.vi.mock('socket.io', () => ({
    Server: vitest_1.vi.fn().mockImplementation(() => ({
        on: vitest_1.vi.fn(),
        emit: vitest_1.vi.fn(),
        to: vitest_1.vi.fn().mockReturnValue({
            emit: vitest_1.vi.fn(),
        }),
        use: vitest_1.vi.fn(),
        listen: vitest_1.vi.fn(),
    })),
}));
vitest_1.vi.mock('jsonwebtoken', () => ({
    verify: vitest_1.vi.fn(),
    sign: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('multer', () => ({
    default: vitest_1.vi.fn().mockReturnValue({
        single: vitest_1.vi.fn(),
        array: vitest_1.vi.fn(),
        fields: vitest_1.vi.fn(),
    }),
}));
vitest_1.vi.mock('fs', () => ({
    promises: {
        unlink: vitest_1.vi.fn(),
        access: vitest_1.vi.fn(),
    },
    existsSync: vitest_1.vi.fn(),
    mkdirSync: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('path', () => ({
    join: vitest_1.vi.fn(),
    resolve: vitest_1.vi.fn(),
    extname: vitest_1.vi.fn(),
}));
vitest_1.vi.setConfig({ testTimeout: 10000 });
//# sourceMappingURL=setup.js.map