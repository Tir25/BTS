"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSupabaseConfig = validateSupabaseConfig;
exports.createSupabaseClient = createSupabaseClient;
exports.testSupabaseConnection = testSupabaseConnection;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../../utils/logger");
const DEFAULT_OPTIONS = {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
};
function validateSupabaseConfig(config, role) {
    if (!config.url || config.url === '' || config.url === 'your_supabase_project_url') {
        throw new Error(`Invalid ${role} Supabase URL. Please check your environment variables.`);
    }
    if (!config.anonKey || config.anonKey === '' || config.anonKey === 'your_supabase_anon_key_here') {
        throw new Error(`Invalid ${role} Supabase anon key. Please check your environment variables.`);
    }
    if (!config.serviceRoleKey || config.serviceRoleKey === '' || config.serviceRoleKey === 'your_supabase_service_role_key_here') {
        throw new Error(`Invalid ${role} Supabase service role key. Please check your environment variables.`);
    }
    try {
        new URL(config.url);
    }
    catch (error) {
        throw new Error(`Invalid ${role} Supabase URL format: ${config.url}`);
    }
}
function createSupabaseClient(config, role, useServiceRole = false, options) {
    try {
        validateSupabaseConfig(config, role);
        const clientOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
            auth: {
                autoRefreshToken: options?.autoRefreshToken ?? DEFAULT_OPTIONS.autoRefreshToken,
                persistSession: options?.persistSession ?? DEFAULT_OPTIONS.persistSession,
                detectSessionInUrl: options?.detectSessionInUrl ?? DEFAULT_OPTIONS.detectSessionInUrl,
                storageKey: options?.storageKey,
            },
            global: {
                headers: {
                    'X-Client-Info': `bus-tracking-${role}`,
                    ...options?.headers,
                },
            },
        };
        const key = useServiceRole ? config.serviceRoleKey : config.anonKey;
        const client = (0, supabase_js_1.createClient)(config.url, key, clientOptions);
        logger_1.logger.info(`✅ ${role} Supabase client created successfully`, 'supabase', {
            role,
            url: config.url,
            useServiceRole,
            hasAnonKey: !!config.anonKey,
            hasServiceRoleKey: !!config.serviceRoleKey,
        });
        return {
            client,
            config,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`❌ Failed to create ${role} Supabase client`, 'supabase', {
            role,
            error: errorMessage,
            url: config.url,
            useServiceRole,
        });
        return {
            client: null,
            config,
            error: error instanceof Error ? error : new Error(errorMessage),
        };
    }
}
async function testSupabaseConnection(client, role) {
    try {
        if (!client.from || typeof client.from !== 'function') {
            logger_1.logger.info(`Skipping ${role} Supabase connection test (mock client)`, 'supabase');
            return true;
        }
        const { error } = await client.from('user_profiles').select('count').limit(1);
        if (error) {
            logger_1.logger.error(`❌ ${role} Supabase connection test failed`, 'supabase', {
                role,
                error: error.message,
            });
            return false;
        }
        logger_1.logger.info(`✅ ${role} Supabase connection test successful`, 'supabase', { role });
        return true;
    }
    catch (error) {
        logger_1.logger.error(`❌ ${role} Supabase connection test error`, 'supabase', {
            role,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
//# sourceMappingURL=clientFactory.js.map