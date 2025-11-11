"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentSupabaseConfig = getStudentSupabaseConfig;
exports.getStudentSupabaseAdmin = getStudentSupabaseAdmin;
exports.resetStudentClient = resetStudentClient;
exports.testStudentConnection = testStudentConnection;
const clientFactory_1 = require("./clientFactory");
const environment_1 = __importDefault(require("../environment"));
const logger_1 = require("../../utils/logger");
let studentAdminClient = null;
let studentConfig = null;
function getStudentSupabaseConfig() {
    if (studentConfig) {
        return studentConfig;
    }
    studentConfig = {
        url: environment_1.default.supabaseStudent.url,
        anonKey: environment_1.default.supabaseStudent.anonKey,
        serviceRoleKey: environment_1.default.supabaseStudent.serviceRoleKey,
    };
    return studentConfig;
}
function getStudentSupabaseAdmin() {
    if (studentAdminClient) {
        return studentAdminClient;
    }
    const config = getStudentSupabaseConfig();
    const result = (0, clientFactory_1.createSupabaseClient)(config, 'student', true, {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    });
    if (result.error || !result.client) {
        logger_1.logger.error('❌ Failed to create student Supabase admin client', 'supabase', {
            error: result.error?.message,
        });
        throw result.error || new Error('Failed to create student Supabase admin client');
    }
    studentAdminClient = result.client;
    if (process.env.NODE_ENV !== 'production') {
        (0, clientFactory_1.testSupabaseConnection)(studentAdminClient, 'student').catch((error) => {
            logger_1.logger.warn('⚠️ Student Supabase connection test failed', 'supabase', { error });
        });
    }
    return studentAdminClient;
}
function resetStudentClient() {
    studentAdminClient = null;
    studentConfig = null;
    logger_1.logger.info('🔄 Student Supabase client reset', 'supabase');
}
async function testStudentConnection() {
    try {
        const client = getStudentSupabaseAdmin();
        return await (0, clientFactory_1.testSupabaseConnection)(client, 'student');
    }
    catch (error) {
        logger_1.logger.error('❌ Student connection test failed', 'supabase', {
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}
//# sourceMappingURL=studentClient.js.map