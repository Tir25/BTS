/**
 * Legacy Supabase Configuration File
 * This file re-exports from the new role-based Supabase configuration
 * @deprecated This file is kept for backward compatibility
 * New code should import directly from './config/supabase' (which resolves to ./config/supabase/index.ts)
 */

// Re-export everything from the new index file
export * from './supabase/index';

// Re-export default for backward compatibility
export { supabase as default } from './supabase/index';
