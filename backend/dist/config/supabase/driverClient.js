"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriverSupabaseConfig = getDriverSupabaseConfig;
exports.getDriverSupabaseAdmin = getDriverSupabaseAdmin;
exports.resetDriverClient = resetDriverClient;
exports.testDriverConnection = testDriverConnection;
const clientFactory_1 = require("./clientFactory");
const environment_1 = __importDefault(require("../environment"));
const logger_1 = require("../../utils/logger");
let driverAdminClient = null;
let driverConfig = null;
function getDriverSupabaseConfig() {
    if (driverConfig) {
        return driverConfig;
    }
    driverConfig = {
        url: environment_1.default.supabaseDriver.url,
        anonKey: environment_1.default.supabaseDriver.anonKey,
        serviceRoleKey: environment_1.default.supabaseDriver.serviceRoleKey,
    };
    return driverConfig;
}
function getDriverSupabaseAdmin() {
    if (driverAdminClient) {
        return driverAdminClient;
    }
    const config = getDriverSupabaseConfig();
    const result = (0, clientFactory_1.createSupabaseClient)(config, 'driver', true, {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    });
    if (result.error || !result.client) {
        logger_1.logger.error('❌ Failed to create driver Supabase admin client', 'supabase', {
            error: result.error?.message,
        });
        throw result.error || new Error('Failed to create driver Supabase admin client');
    }
    driverAdminClient = result.client;
    if (process.env.NODE_ENV !== 'production') {
        (0, clientFactory_1.testSupabaseConnection)(driverAdminClient, 'driver').catch((error) => {
            logger_1.logger.warn('⚠️ Driver Supabase connection test failed', 'supabase', { error });
        });
    }
    return driverAdminClient;
}
function resetDriverClient() {
    driverAdminClient = null;
    driverConfig = null;
    logger_1.logger.info('🔄 Driver Supabase client reset', 'supabase');
}
async function testDriverConnection() {
    try {
        const client = getDriverSupabaseAdmin();
        return await (0, clientFactory_1.testSupabaseConnection)(client, 'driver');
    }
    catch (error) {
        logger_1.logger.error('❌ Driver connection test failed', 'supabase', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
//# sourceMappingURL=driverClient.js.map