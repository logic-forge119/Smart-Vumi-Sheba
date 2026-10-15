export interface ServerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  allowedOrigins: string[];
  dataMode: 'synthetic';
  activeRulesVersion: string;
  activeDatasetVersion: string;
  nodeEnv: string;
}

export function loadEnv(): ServerEnv {
  return {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:8888,http://localhost:3000,http://127.0.0.1:8888')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean),
    dataMode: 'synthetic',
    activeRulesVersion: process.env.ACTIVE_RULES_VERSION || 'v1',
    activeDatasetVersion: process.env.ACTIVE_DATASET_VERSION || 'synthetic-v2',
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}
