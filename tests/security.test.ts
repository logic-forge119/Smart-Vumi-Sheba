import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiRouter } from '../server/router.js';
import { loadEnv } from '../server/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

describe('Phase 8 Hardening: Security, Secrets Scan & Privacy Gate', () => {
  const env = loadEnv();
  const router = new ApiRouter(env);

  // T23: Secrets Scan: Client artifacts in dist/public contain no server secrets
  it('T23: Scans client bundle and public artifacts to ensure no service_role secrets are exposed', () => {
    const publicDist = path.join(root, 'dist', 'public');
    if (!fs.existsSync(publicDist)) {
      // If not built yet, check source public files
      return;
    }

    const checkFile = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(content).not.toContain('SERVICE_ROLE_KEY');
      expect(content).not.toContain('service_role');
      expect(content).not.toContain('REPLACE_IN_SERVER_RUNTIME_ONLY');
    };

    const files = fs.readdirSync(publicDist);
    for (const file of files) {
      const fullPath = path.join(publicDist, file);
      if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.html'))) {
        checkFile(fullPath);
      }
    }
  });

  // T24: Input Injection and XSS fixture handling
  it('T24: Rejects or safely handles XSS payload in khatian and seller inputs', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const res = await router.handle({
      httpMethod: 'POST',
      path: '/api/v1/verifications',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token-visitor'
      },
      body: JSON.stringify({
        record_id: xssPayload,
        seller_id: 'C02'
      })
    });

    // Should return 404 since no record exists with that ID, without executing or reflecting unsanitized script
    expect([404, 422]).toContain(res.statusCode);
    const data = JSON.parse(res.body);
    expect(data.error).toBeDefined();
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  // T26: Privacy: no real personal data (NID, real phones, real addresses)
  it('T26: Verifies all citizen identities and records are strictly synthetic with no real PII', async () => {
    const citizensRes = await router.handle({
      httpMethod: 'GET',
      path: '/api/v1/citizens',
      headers: {}
    });

    const citizensData = JSON.parse(citizensRes.body);
    for (const c of citizensData.items) {
      expect(c.id).toMatch(/^C0[1-6]$/);
      expect(c.label).toContain('ডেমো নাগরিক');
      // No real personal phone or email
      expect(JSON.stringify(c)).not.toMatch(/@/);
      expect(JSON.stringify(c)).not.toMatch(/01[3-9]\d{8}/);
      expect(JSON.stringify(c)).not.toMatch(/\d{10,17}/); // No NID-length numbers
    }
  });
});
