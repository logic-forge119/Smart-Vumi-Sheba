import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServerEnv } from '../env.js';
import { AppError } from '../errors.js';
import {
  syntheticDatasetV2,
  syntheticCitizens,
  syntheticScenarios,
  syntheticMutationCasesDetails
} from './syntheticData.js';
import type {
  DatasetSnapshot,
  ParcelRecord,
  VerificationResult
} from '../domain/verification/index.js';

export interface StoredReport {
  id: string;
  ownerUid: string;
  datasetId: string;
  recordId: string;
  sellerId: string | null;
  rulesVersion: string;
  outcome: string;
  snapshot: VerificationResult;
  snapshotSha256: string;
  createdAt: string;
}

export interface StoredDraft {
  id: string;
  ownerUid: string;
  clientDraftId: string;
  revision: number;
  body: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface StoredIdempotencyKey {
  ownerUid: string;
  key: string;
  requestSha256: string;
  reportId: string;
  expiresAt: string;
}

// Memory stores for local/test mode
const inMemoryReports = new Map<string, StoredReport>();
const inMemoryDrafts = new Map<string, StoredDraft>();
const inMemoryIdempotency = new Map<string, StoredIdempotencyKey>();

export class Repository {
  constructor(
    private readonly env: ServerEnv,
    public readonly supabase?: SupabaseClient
  ) {}

  async getDataset(version: string = this.env.activeDatasetVersion): Promise<DatasetSnapshot> {
    if (version !== 'synthetic-v2') {
      throw new AppError(503, 'DATASET_UNAVAILABLE', 'অনুরোধকৃত ডেটাসেট সংস্করণ পাওয়া যায়নি বা অপ্রকাশিত।');
    }
    return syntheticDatasetV2;
  }

  async getScenarios(): Promise<typeof syntheticScenarios> {
    return syntheticScenarios;
  }

  async getCitizens(): Promise<Array<{ id: string; label: string }>> {
    return syntheticCitizens;
  }

  async getLocations(): Promise<object> {
    return {
      division: 'ঢাকা',
      district: 'ঢাকা',
      upazila: 'সাভার',
      mouza: 'আশুলিয়া',
      surveys: ['CS', 'SA', 'RS', 'BS', 'BRS']
    };
  }

  async searchRecords(params: {
    district: string;
    upazila: string;
    mouza: string;
    survey?: string;
    khatian_no?: string;
    dag_no?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: ParcelRecord[]; total: number }> {
    const ds = await this.getDataset();
    let matches = ds.records.filter(r => {
      if (params.district && (r.district || 'ঢাকা') !== params.district) return false;
      if (params.upazila && (r.upazila || 'সাভার') !== params.upazila) return false;
      if (params.mouza && (r.mouza || 'আশুলিয়া') !== params.mouza) return false;
      if (params.survey && r.survey !== params.survey) return false;
      if (params.khatian_no && r.id !== params.khatian_no) return false;
      if (params.dag_no && r.plot !== params.dag_no) return false;
      return true;
    });

    const total = matches.length;
    const items = matches.slice(params.offset, params.offset + params.limit);
    return { items, total };
  }

  async getRecordById(idOrKhatian: string, survey?: string, mouza: string = 'আশুলিয়া'): Promise<ParcelRecord | null> {
    const ds = await this.getDataset();
    const found = ds.records.find(r => {
      const idMatch = r.id === idOrKhatian || r.plot === idOrKhatian;
      if (!idMatch) return false;
      if (survey && r.survey !== survey) return false;
      if (mouza && (r.mouza || 'আশুলিয়া') !== mouza) return false;
      return true;
    });
    return found || null;
  }

  async getMutationByTrackingCode(trackingCode: string): Promise<object | null> {
    const ds = await this.getDataset();
    const mut = ds.mutations.find(m => m.id.toUpperCase() === trackingCode.toUpperCase());
    if (!mut) return null;

    const details = syntheticMutationCasesDetails[mut.id] || {
      stage: mut.status === 'completed' ? 4 : 2,
      submitted: '০১ অক্টোবর ২০২৬',
      desk: 'নমুনা ডেস্ক',
      days: 10,
      hearing: 'অপেক্ষমাণ'
    };

    const stages = [
      'আবেদন দাখিল',
      'প্রাথমিক যাচাই',
      'তদন্ত ও প্রতিবেদন',
      'শুনানি',
      'খতিয়ান অনুমোদন ও DCR'
    ];

    return {
      tracking_code: mut.id,
      plot: mut.plot,
      survey: mut.survey || 'BS',
      owner_id: mut.ownerId,
      status: mut.status,
      stage: details.stage,
      stage_label: stages[details.stage],
      submitted_at: details.submitted,
      desk: details.desk,
      days_elapsed: details.days,
      hearing: details.hearing,
      deed_id: mut.deedId,
      source: mut.source
    };
  }

  async saveVerificationReport(
    ownerUid: string,
    result: VerificationResult,
    idempotencyKey?: string,
    requestBodyString?: string
  ): Promise<{ report: VerificationResult; id: string; replayed: boolean }> {
    const bodyDigest = requestBodyString
      ? crypto.createHash('sha256').update(requestBodyString, 'utf8').digest('hex')
      : '';

    // Check Idempotency if provided
    if (idempotencyKey) {
      const compositeKey = `${ownerUid}:${idempotencyKey}`;
      const existingKey = inMemoryIdempotency.get(compositeKey);
      if (existingKey) {
        if (existingKey.requestSha256 !== bodyDigest) {
          throw new AppError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'একই Idempotency-Key ভিন্ন পে-লোডের সাথে পুনরায় ব্যবহার করা হয়েছে।'
          );
        }
        // Return existing report
        const existingReport = inMemoryReports.get(existingKey.reportId);
        if (existingReport && existingReport.ownerUid === ownerUid) {
          return {
            report: existingReport.snapshot,
            id: existingReport.id,
            replayed: true
          };
        }
      }
    }

    const reportId = 'REP-' + crypto.randomUUID();
    const stored: StoredReport = {
      id: reportId,
      ownerUid,
      datasetId: result.datasetVersion,
      recordId: result.record.id,
      sellerId: result.sellerId,
      rulesVersion: result.rulesVersion,
      outcome: result.outcome,
      snapshot: { ...result, generatedAt: result.generatedAt },
      snapshotSha256: result.snapshotSha256,
      createdAt: result.generatedAt
    };

    // Store report
    inMemoryReports.set(reportId, stored);

    // Save Idempotency key if provided
    if (idempotencyKey && bodyDigest) {
      const compositeKey = `${ownerUid}:${idempotencyKey}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      inMemoryIdempotency.set(compositeKey, {
        ownerUid,
        key: idempotencyKey,
        requestSha256: bodyDigest,
        reportId,
        expiresAt
      });
    }

    return {
      report: stored.snapshot,
      id: reportId,
      replayed: false
    };
  }

  async listReports(ownerUid: string): Promise<Array<{
    id: string;
    record: ParcelRecord;
    outcome: string;
    counts: { pass: number; fail: number; unknown: number };
    generatedAt: string;
    datasetVersion: string;
  }>> {
    const results: Array<{
      id: string;
      record: ParcelRecord;
      outcome: string;
      counts: { pass: number; fail: number; unknown: number };
      generatedAt: string;
      datasetVersion: string;
    }> = [];

    for (const rep of inMemoryReports.values()) {
      if (rep.ownerUid === ownerUid) {
        results.push({
          id: rep.id,
          record: rep.snapshot.record,
          outcome: rep.snapshot.outcome,
          counts: rep.snapshot.counts,
          generatedAt: rep.snapshot.generatedAt,
          datasetVersion: rep.snapshot.datasetVersion
        });
      }
    }

    return results.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async getReportById(ownerUid: string, reportId: string): Promise<VerificationResult | null> {
    const rep = inMemoryReports.get(reportId);
    if (!rep || rep.ownerUid !== ownerUid) {
      return null; // IDOR isolation: User B cannot see User A's report
    }
    return rep.snapshot;
  }

  async listDrafts(ownerUid: string): Promise<StoredDraft[]> {
    const drafts: StoredDraft[] = [];
    for (const d of inMemoryDrafts.values()) {
      if (d.ownerUid === ownerUid) {
        drafts.push(d);
      }
    }
    return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getDraftById(ownerUid: string, draftId: string): Promise<StoredDraft | null> {
    for (const d of inMemoryDrafts.values()) {
      if (d.ownerUid === ownerUid && (d.id === draftId || d.clientDraftId === draftId)) {
        return d;
      }
    }
    return null;
  }

  async saveDraft(
    ownerUid: string,
    clientDraftId: string,
    expectedRevision: number,
    body: Record<string, unknown>
  ): Promise<StoredDraft> {
    const compositeKey = `${ownerUid}:${clientDraftId}`;
    const existing = inMemoryDrafts.get(compositeKey);

    if (existing) {
      if (existing.revision !== expectedRevision) {
        throw new AppError(
          409,
          'DRAFT_CONFLICT',
          `খসড়ার সংস্করণ অসঙ্গতি। বর্তমান সংস্করণ: ${existing.revision}, অনুরোধকৃত: ${expectedRevision}`
        );
      }
      existing.revision += 1;
      existing.body = body;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    const newDraft: StoredDraft = {
      id: 'DFT-' + crypto.randomUUID(),
      ownerUid,
      clientDraftId,
      revision: 1,
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inMemoryDrafts.set(compositeKey, newDraft);
    return newDraft;
  }

  async deleteDraft(ownerUid: string, draftId: string): Promise<boolean> {
    for (const [key, d] of inMemoryDrafts.entries()) {
      if (d.ownerUid === ownerUid && (d.id === draftId || d.clientDraftId === draftId)) {
        inMemoryDrafts.delete(key);
        return true;
      }
    }
    return false;
  }

  // Clear in-memory state for testing isolation
  static resetForTesting(): void {
    inMemoryReports.clear();
    inMemoryDrafts.clear();
    inMemoryIdempotency.clear();
  }
}
