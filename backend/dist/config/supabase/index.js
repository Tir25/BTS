"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.supabaseAdmin = exports.testStudentConnection = exports.resetStudentClient = exports.getStudentSupabaseConfig = exports.getStudentSupabaseAdmin = exports.testDriverConnection = exports.resetDriverClient = exports.getDriverSupabaseConfig = exports.getDriverSupabaseAdmin = exports.testSupabaseConnection = exports.validateSupabaseConfig = exports.createSupabaseClient = void 0;
exports.getSupabaseAdmin = getSupabaseAdmin;
exports.getSupabase = getSupabase;
var clientFactory_1 = require("./clientFactory");
Object.defineProperty(exports, "createSupabaseClient", { enumerable: true, get: function () { return clientFactory_1.createSupabaseClient; } });
Object.defineProperty(exports, "validateSupabaseConfig", { enumerable: true, get: function () { return clientFactory_1.validateSupabaseConfig; } });
Object.defineProperty(exports, "testSupabaseConnection", { enumerable: true, get: function () { return clientFactory_1.testSupabaseConnection; } });
const driverClient_1 = require("./driverClient");
Object.defineProperty(exports, "getDriverSupabaseAdmin", { enumerable: true, get: function () { return driverClient_1.getDriverSupabaseAdmin; } });
Object.defineProperty(exports, "getDriverSupabaseConfig", { enumerable: true, get: function () { return driverClient_1.getDriverSupabaseConfig; } });
Object.defineProperty(exports, "resetDriverClient", { enumerable: true, get: function () { return driverClient_1.resetDriverClient; } });
Object.defineProperty(exports, "testDriverConnection", { enumerable: true, get: function () { return driverClient_1.testDriverConnection; } });
const studentClient_1 = require("./studentClient");
Object.defineProperty(exports, "getStudentSupabaseAdmin", { enumerable: true, get: function () { return studentClient_1.getStudentSupabaseAdmin; } });
Object.defineProperty(exports, "getStudentSupabaseConfig", { enumerable: true, get: function () { return studentClient_1.getStudentSupabaseConfig; } });
Object.defineProperty(exports, "resetStudentClient", { enumerable: true, get: function () { return studentClient_1.resetStudentClient; } });
Object.defineProperty(exports, "testStudentConnection", { enumerable: true, get: function () { return studentClient_1.testStudentConnection; } });
const driverClient_2 = require("./driverClient");
const logger_1 = require("../../utils/logger");
function getSupabaseAdmin() {
    logger_1.logger.warn('⚠️ Using legacy getSupabaseAdmin(). Consider migrating to getDriverSupabaseAdmin() or getStudentSupabaseAdmin()', 'supabase');
    return (0, driverClient_2.getDriverSupabaseAdmin)();
}
function getSupabase() {
    logger_1.logger.warn('⚠️ Using legacy getSupabase(). Consider migrating to role-specific clients', 'supabase');
    return (0, driverClient_2.getDriverSupabaseAdmin)();
}
exports.supabaseAdmin = (0, driverClient_2.getDriverSupabaseAdmin)();
exports.supabase = (0, driverClient_2.getDriverSupabaseAdmin)();
exports.default = {
    getDriverSupabaseAdmin: driverClient_1.getDriverSupabaseAdmin,
    getStudentSupabaseAdmin: studentClient_1.getStudentSupabaseAdmin,
    getSupabaseAdmin,
    getSupabase,
};
//# sourceMappingURL=index.js.map