import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const distPublic = path.join(root, 'dist', 'public');

if (!fs.existsSync(distPublic)) {
  fs.mkdirSync(distPublic, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'app.js',
  'demo-data.js',
  'verification.js',
  'verification-ui.js',
  'sw.js',
  'manifest.webmanifest',
  'icon.svg',
  '_headers',
  '_redirects'
];

for (const f of filesToCopy) {
  const src = path.join(root, f);
  const dest = path.join(distPublic, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copy client JS files if existing
const jsDir = path.join(root, 'js');
if (fs.existsSync(jsDir)) {
  const destJs = path.join(distPublic, 'js');
  if (!fs.existsSync(destJs)) {
    fs.mkdirSync(destJs, { recursive: true });
  }
  for (const f of fs.readdirSync(jsDir)) {
    fs.copyFileSync(path.join(jsDir, f), path.join(destJs, f));
  }
}

// Load .env if present
function loadDotEnv() {
  const envPath = path.join(root, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
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
        env[key] = val;
      }
    }
  }
  return { ...env, ...process.env };
}

const env = loadDotEnv();

// Generate deliberate public browser config (Never includes secret keys)
const publicConfig = `window.__BHUMI_CONFIG__ = Object.freeze({
  SUPABASE_URL: ${JSON.stringify(env.SUPABASE_URL || '')},
  SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY || '')},
  DATA_MODE: "synthetic",
  ACTIVE_DATASET_VERSION: ${JSON.stringify(env.ACTIVE_DATASET_VERSION || 'synthetic-v2')}
});
`;
fs.writeFileSync(path.join(distPublic, 'config.js'), publicConfig, 'utf8');
fs.writeFileSync(path.join(root, 'config.js'), publicConfig, 'utf8');

console.log('Static assets and public config copied to dist/public successfully.');
