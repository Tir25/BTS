"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const environment_1 = __importDefault(require("./environment"));
const finalSupabaseUrl = environment_1.default.supabase.url;
const finalSupabaseAnonKey = environment_1.default.supabase.anonKey;
const finalSupabaseServiceRoleKey = environment_1.default.supabase.serviceRoleKey;
exports.supabase = (0, supabase_js_1.createClient)(finalSupabaseUrl, finalSupabaseAnonKey);
exports.supabaseAdmin = (0, supabase_js_1.createClient)(finalSupabaseUrl, finalSupabaseServiceRoleKey);
exports.default = exports.supabase;
//# sourceMappingURL=supabase.js.map