import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ServerEnv } from './env.js';
import { AppError, createErrorResponse } from './errors.js';
import { verifyAuthToken, type AuthContext } from './auth/index.js';
import {
  SearchRecordsQuerySchema,
  CreateVerificationBodySchema,
  SaveDraftBodySchema,
  normalizeBengaliDigits
} from './validation/index.js';
import { evaluateVerification } from './domain/verification/index.js';
import { Repository } from './repositories/index.js';

export interface HttpRequest {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class ApiRouter {
  private readonly repository: Repository;
  private readonly supabase?: SupabaseClient;
  private readonly inMemoryRateLimits = new Map<string, { tokens: number; lastReplenished: number }>();

  constructor(private readonly env: ServerEnv, supabase?: SupabaseClient) {
    if (supabase) {
      this.supabase = supabase;
    } else if (
      env.supabaseUrl &&
      env.supabaseServiceRoleKey &&
      !env.supabaseServiceRoleKey.startsWith('REPLACE_')
    ) {
      this.supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false }
      });
    }
    this.repository = new Repository(env, this.supabase);
  }

  private async checkRateLimit(key: string, maxTokens: number, refillRateSeconds: number): Promise<void> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.rpc('check_rate_limit', {
          p_key: key,
          p_max_tokens: maxTokens,
          p_refill_rate_seconds: refillRateSeconds
        });
        if (!error && data === false) {
          throw new AppError(429, 'TOO_MANY_REQUESTS', 'অনুরোধের সীমা অতিক্রম করেছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
      }
      return;
    }

    // In-memory token bucket for local test environment
    const now = Date.now();
    const entry = this.inMemoryRateLimits.get(key) || { tokens: maxTokens, lastReplenished: now };
    const elapsedSeconds = Math.floor((now - entry.lastReplenished) / (refillRateSeconds * 1000));
    if (elapsedSeconds > 0) {
      entry.tokens = Math.min(maxTokens, entry.tokens + elapsedSeconds);
      entry.lastReplenished = now;
    }

    if (entry.tokens > 0) {
      entry.tokens -= 1;
      this.inMemoryRateLimits.set(key, entry);
    } else {
      throw new AppError(429, 'TOO_MANY_REQUESTS', 'অনুরোধের সীমা অতিক্রম করেছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }
  }

  async handle(req: HttpRequest): Promise<HttpResponse> {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    const method = req.httpMethod.toUpperCase();

    // Standard security response headers (standardized lowercase keys)
    const baseHeaders: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-content-type-options': 'nosniff',
      'x-request-id': requestId
    };

    // CORS origin check
    const origin = req.headers['origin'];
    if (origin && this.env.allowedOrigins.includes(origin)) {
      baseHeaders['access-control-allow-origin'] = origin;
      baseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      baseHeaders['access-control-allow-headers'] = 'Content-Type, Authorization, Idempotency-Key, X-Request-Id';
    }

    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: baseHeaders, body: '' };
    }

    try {
      // Shared Rate Limiting (Token Bucket: 120 req/min for reads, 30 req/min for writes)
      const clientIp = (
        req.headers['x-forwarded-for'] ||
        req.headers['client-ip'] ||
        req.headers['x-real-ip'] ||
        '127.0.0.1'
      ).split(',')[0].trim();

      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      const maxTokens = isWrite ? 30 : 120;
      const rateLimitKey = `rl:${clientIp}:${isWrite ? 'write' : 'read'}`;

      await this.checkRateLimit(rateLimitKey, maxTokens, 1);

      // 1. Normalize path: strip /api/v1, /api, or /.netlify/functions/api
      let normalizedPath = req.path
        .replace(/^\/\.netlify\/functions\/api/, '')
        .replace(/^\/api\/v1/, '')
        .replace(/^\/api/, '')
        .replace(/^\/v1/, '')
        .trim();

      if (!normalizedPath.startsWith('/')) {
        normalizedPath = '/' + normalizedPath;
      }
      // Remove trailing slash if not root
      if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath.slice(0, -1);
      }

      // 2. Validate content-type and body size for write methods
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const contentType = req.headers['content-type'] || req.headers['Content-Type'] || '';
        if (!contentType.includes('application/json')) {
          throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'অনুরোধের Content-Type অবশ্যই application/json হতে হবে।');
        }

        if (req.body) {
          const bodySize = Buffer.byteLength(req.body, 'utf8');
          if (bodySize > 32 * 1024) {
            throw new AppError(422, 'PAYLOAD_TOO_LARGE', 'অনুরোধের সাইজ ৩২ কিলোবাইটের বেশি হতে পারবে না।');
          }
        }
      }

      // Helper to parse JSON body
      const parseJsonBody = () => {
        if (!req.body) return {};
        try {
          return JSON.parse(req.body);
        } catch {
          throw new AppError(400, 'INVALID_JSON', 'অনুরোধের বডি সঠিক JSON ফরম্যাটে নেই।');
        }
      };

      // Helper to require authentication
      const requireAuth = async (): Promise<AuthContext> => {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        return verifyAuthToken(authHeader, this.env, this.supabase);
      };

      // 3. Routing Table

      // GET /health
      if (method === 'GET' && normalizedPath === '/health') {
        const responseBody = {
          status: 'ok',
          data_mode: this.env.dataMode,
          rules_version: this.env.activeRulesVersion,
          dataset_version: this.env.activeDatasetVersion,
          timestamp: new Date().toISOString()
        };
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(responseBody)
        };
      }

      // GET /scenarios
      if (method === 'GET' && normalizedPath === '/scenarios') {
        const scenarios = await this.repository.getScenarios();
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({ items: scenarios, count: scenarios.length })
        };
      }

      // GET /locations
      if (method === 'GET' && normalizedPath === '/locations') {
        const locations = await this.repository.getLocations();
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(locations)
        };
      }

      // GET /citizens
      if (method === 'GET' && normalizedPath === '/citizens') {
        const citizens = await this.repository.getCitizens();
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({ items: citizens, count: citizens.length })
        };
      }

      // GET /records
      if (method === 'GET' && normalizedPath === '/records') {
        const rawQuery = req.queryStringParameters || {};
        const parsed = SearchRecordsQuerySchema.safeParse(rawQuery);
        if (!parsed.success) {
          throw new AppError(422, 'INVALID_QUERY', 'অনুসন্ধানের প্যারামিটার সঠিক নয়: ' + parsed.error.issues.map(i => i.message).join(', '));
        }

        const result = await this.repository.searchRecords(parsed.data);
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({
            items: result.items,
            total: result.total,
            limit: parsed.data.limit,
            offset: parsed.data.offset
          })
        };
      }

      // GET /records/:id
      const recordMatch = normalizedPath.match(/^\/records\/([^/]+)$/);
      if (method === 'GET' && recordMatch) {
        const recordId = normalizeBengaliDigits(decodeURIComponent(recordMatch[1]));
        const survey = req.queryStringParameters?.survey;
        const mouza = req.queryStringParameters?.mouza || 'আশুলিয়া';
        const record = await this.repository.getRecordById(recordId, survey, mouza);
        if (!record) {
          throw new AppError(404, 'RECORD_NOT_FOUND', 'উক্ত খতিয়ান বা দাগ নম্বরের নমুনা রেকর্ড পাওয়া যায়নি।');
        }
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(record)
        };
      }

      // GET /mutations/:trackingCode
      const mutationMatch = normalizedPath.match(/^\/mutations\/([^/]+)$/);
      if (method === 'GET' && mutationMatch) {
        const rawCode = normalizeBengaliDigits(decodeURIComponent(mutationMatch[1])).toUpperCase();
        const mut = await this.repository.getMutationByTrackingCode(rawCode);
        if (!mut) {
          throw new AppError(404, 'MUTATION_NOT_FOUND', 'উক্ত নম্বরের নমুনা নামজারি আবেদন পাওয়া যায়নি।');
        }
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(mut)
        };
      }

      // POST /verifications
      if (method === 'POST' && normalizedPath === '/verifications') {
        const auth = await requireAuth();
        const body = parseJsonBody();

        // Disallow client attempting to inject outcome or scores or owner_uid
        if ('outcome' in body || 'scores' in body || 'owner_uid' in body || 'checks' in body) {
          throw new AppError(422, 'UNEXPECTED_FIELD', 'ক্লায়েন্ট থেকে যাচাইয়ের ফলাফল বা মালিকানা পাঠানো নিষিদ্ধ।');
        }

        const parsed = CreateVerificationBodySchema.safeParse(body);
        if (!parsed.success) {
          throw new AppError(422, 'VALIDATION_ERROR', 'যাচাইয়ের ইনপুট সঠিক নয়: ' + parsed.error.issues.map(i => i.message).join(', '));
        }

        const normRecordId = normalizeBengaliDigits(parsed.data.record_id);
        const record = await this.repository.getRecordById(normRecordId, parsed.data.survey, parsed.data.mouza);
        if (!record) {
          throw new AppError(404, 'RECORD_NOT_FOUND', 'যাচাইয়ের জন্য নির্দিষ্ট প্লট বা খতিয়ান পাওয়া যায়নি।');
        }

        const dataset = await this.repository.getDataset(this.env.activeDatasetVersion);
        const verificationResult = evaluateVerification(
          record,
          parsed.data.seller_id || null,
          dataset,
          this.env.activeRulesVersion
        );

        const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
        const saved = await this.repository.saveVerificationReport(
          auth.uid,
          verificationResult,
          idempotencyKey,
          req.body || ''
        );

        return {
          statusCode: saved.replayed ? 200 : 201,
          headers: baseHeaders,
          body: JSON.stringify({
            id: saved.id,
            report: saved.report,
            replayed: saved.replayed
          })
        };
      }

      // GET /reports
      if (method === 'GET' && normalizedPath === '/reports') {
        const auth = await requireAuth();
        const reports = await this.repository.listReports(auth.uid);
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({ items: reports, count: reports.length })
        };
      }

      // GET /reports/:id
      const reportMatch = normalizedPath.match(/^\/reports\/([^/]+)$/);
      if (method === 'GET' && reportMatch) {
        const auth = await requireAuth();
        const reportId = decodeURIComponent(reportMatch[1]);
        const report = await this.repository.getReportById(auth.uid, reportId);
        if (!report) {
          // IDOR isolation: returns 404 if not found or not owned by caller
          throw new AppError(404, 'REPORT_NOT_FOUND', 'অনুরোধকৃত রিপোর্ট পাওয়া যায়নি বা দেখার অনুমতি নেই।');
        }
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(report)
        };
      }

      // GET /drafts
      if (method === 'GET' && normalizedPath === '/drafts') {
        const auth = await requireAuth();
        const drafts = await this.repository.listDrafts(auth.uid);
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({ items: drafts, count: drafts.length })
        };
      }

      // GET /drafts/:id
      const draftMatch = normalizedPath.match(/^\/drafts\/([^/]+)$/);
      if (method === 'GET' && draftMatch) {
        const auth = await requireAuth();
        const draftId = decodeURIComponent(draftMatch[1]);
        const draft = await this.repository.getDraftById(auth.uid, draftId);
        if (!draft) {
          throw new AppError(404, 'DRAFT_NOT_FOUND', 'খসড়া পাওয়া যায়নি।');
        }
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(draft)
        };
      }

      // POST /drafts
      if (method === 'POST' && normalizedPath === '/drafts') {
        const auth = await requireAuth();
        const body = parseJsonBody();
        const parsed = SaveDraftBodySchema.safeParse(body);
        if (!parsed.success) {
          throw new AppError(422, 'VALIDATION_ERROR', 'খসড়ার ডেটা সঠিক নয়: ' + parsed.error.issues.map(i => i.message).join(', '));
        }

        const saved = await this.repository.saveDraft(
          auth.uid,
          parsed.data.client_draft_id,
          parsed.data.revision,
          parsed.data.body
        );

        return {
          statusCode: 201,
          headers: baseHeaders,
          body: JSON.stringify(saved)
        };
      }

      // PUT /drafts/:id
      if (method === 'PUT' && draftMatch) {
        const auth = await requireAuth();
        const draftId = decodeURIComponent(draftMatch[1]);
        const body = parseJsonBody();
        const parsed = SaveDraftBodySchema.safeParse(body);
        if (!parsed.success) {
          throw new AppError(422, 'VALIDATION_ERROR', 'খসড়ার ডেটা সঠিক নয়: ' + parsed.error.issues.map(i => i.message).join(', '));
        }

        const saved = await this.repository.saveDraft(
          auth.uid,
          draftId,
          parsed.data.revision,
          parsed.data.body
        );

        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify(saved)
        };
      }

      // DELETE /drafts/:id
      if (method === 'DELETE' && draftMatch) {
        const auth = await requireAuth();
        const draftId = decodeURIComponent(draftMatch[1]);
        const deleted = await this.repository.deleteDraft(auth.uid, draftId);
        if (!deleted) {
          throw new AppError(404, 'DRAFT_NOT_FOUND', 'মুছে ফেলার জন্য খসড়াটি পাওয়া যায়নি।');
        }
        return {
          statusCode: 200,
          headers: baseHeaders,
          body: JSON.stringify({ success: true, message_bn: 'খসড়া সফলভাবে মুছে ফেলা হয়েছে।' })
        };
      }

      // Unknown route
      throw new AppError(404, 'NOT_FOUND', `অনুরোধকৃত পাথ পাওয়া যায়নি: ${req.path}`);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        return createErrorResponse(err.statusCode, err.code, err.messageBn, requestId);
      }
      const genericMessage = err instanceof Error ? err.message : 'সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে।';
      return createErrorResponse(500, 'INTERNAL_SERVER_ERROR', genericMessage, requestId);
    }
  }
}
