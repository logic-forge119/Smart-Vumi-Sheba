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
  '_headers'
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

// Generate deliberate public browser config (Never includes secret keys)
const publicConfig = `window.__BHUMI_CONFIG__ = Object.freeze({
  SUPABASE_URL: ${JSON.stringify(process.env.SUPABASE_URL || '')},
  SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY || '')},
  DATA_MODE: "synthetic",
  ACTIVE_DATASET_VERSION: ${JSON.stringify(process.env.ACTIVE_DATASET_VERSION || 'synthetic-v2')}
});
`;
fs.writeFileSync(path.join(distPublic, 'config.js'), publicConfig, 'utf8');
fs.writeFileSync(path.join(root, 'config.js'), publicConfig, 'utf8');

console.log('Static assets and public config copied to dist/public successfully.');
