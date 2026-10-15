import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

describe('Phase 7 Frontend Integration & Offline Gate', () => {
  const swPath = path.join(root, 'sw.js');
  const indexHtmlPath = path.join(root, 'index.html');
  const apiClientPath = path.join(root, 'js', 'api-client.js');

  it('Service Worker explicitly bypasses /api/, /.netlify/, and auth paths from cache', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const swContent = fs.readFileSync(swPath, 'utf8');

    expect(swContent).toContain("url.pathname.startsWith('/api/')");
    expect(swContent).toContain("url.pathname.startsWith('/.netlify/')");
    expect(swContent).toContain("url.pathname.includes('/auth/')");
    expect(swContent).toContain("e.request.method !== 'GET'");
  });

  it('index.html includes js/api-client.js before application scripts', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain('<script src="js/api-client.js?v=3"></script>');
    const apiIndex = html.indexOf('js/api-client.js');
    const appIndex = html.indexOf('app.js');
    expect(apiIndex).toBeLessThan(appIndex);
  });

  it('Preserves green-and-white theme, service cards, and modal elements in index.html', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    // Brand and theme
    expect(html).toContain('স্মার্ট ভূমি সেবা');
    expect(html).toContain('--green:#07634d');
    expect(html).toContain('--dark:#104535');
    // Service grid and modal
    expect(html).toContain('id="serviceGrid"');
    expect(html).toContain('id="modal"');
    expect(html).toContain('id="modalBody"');
    expect(html).toContain('id="globalQuery"');
    // Accessibility
    expect(html).toContain('lang="bn"');
  });

  it('API Client provides session management, timeout, and endpoint methods', () => {
    expect(fs.existsSync(apiClientPath)).toBe(true);
    const code = fs.readFileSync(apiClientPath, 'utf8');

    expect(code).toContain('ensureSession');
    expect(code).toContain('clearSession');
    expect(code).toContain('verify:');
    expect(code).toContain('searchRecords:');
    expect(code).toContain('getMutation:');
    expect(code).toContain('getReports:');
    expect(code).toContain('saveDraft:');
    expect(code).toContain('Idempotency-Key');
    expect(code).toContain('AbortController');
  });
});
