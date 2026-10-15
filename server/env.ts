import fs from 'node:fs';
import path from 'node:path';

export interface ServerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  allowedOrigins: string[];
  dataMode: 'synthetic';
  activeRulesVersion: string;
  activeDatasetVersion: string;
  nodeEnv: string;
}

function parseDotEnvFile(): Record<string, string> {
  const result: Record<string, string> = {};
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env')
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          result[key] = val;
        }
      }
      break;
    }
  }
  return result;
}

export function loadEnv(): ServerEnv {
  const dotEnv = parseDotEnvFile();
  const get = (key: string, def: string = '') => process.env[key] || dotEnv[key] || def;

  return {
    supabaseUrl: get('SUPABASE_URL'),
    supabaseServiceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
    allowedOrigins: get('ALLOWED_ORIGINS', 'http://localhost:8888,http://localhost:3000,http://127.0.0.1:8888')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean),
    dataMode: 'synthetic',
    activeRulesVersion: get('ACTIVE_RULES_VERSION', 'v1'),
    activeDatasetVersion: get('ACTIVE_DATASET_VERSION', 'synthetic-v2'),
    nodeEnv: process.env.VITEST ? 'test' : (process.env.NODE_ENV || dotEnv['NODE_ENV'] || 'development')
  };
}
