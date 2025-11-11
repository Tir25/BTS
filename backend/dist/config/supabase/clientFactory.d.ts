import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { SupabaseProjectConfig, SupabaseClientOptions, ClientFactoryResult } from './types';
export declare function validateSupabaseConfig(config: SupabaseProjectConfig, role: string): void;
export declare function createSupabaseClient(config: SupabaseProjectConfig, role: string, useServiceRole?: boolean, options?: SupabaseClientOptions): ClientFactoryResult<SupabaseClient<Database>>;
export declare function testSupabaseConnection(client: SupabaseClient<Database>, role: string): Promise<boolean>;
//# sourceMappingURL=clientFactory.d.ts.map