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

// Memory stores restricted strictly to test mode (NODE_ENV === 'test')
const inMemoryReports = new Map<string, StoredReport>();
const inMemoryDrafts = new Map<string, StoredDraft>();
const inMemoryIdempotency = new Map<string, StoredIdempotencyKey>();

export class Repository {
  constructor(
    private readonly env: ServerEnv,
    public readonly supabase?: SupabaseClient
  ) {}

  private checkProductionSupabase(): void {
    if (this.env.nodeEnv !== 'test' && !this.supabase) {
      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        'Supabase কনফিগারেশন অনুপস্থিত। প্রোডাকশন রানটাইমে মেমরি ফলব্যাক নিষিদ্ধ।'
      );
    }
  }

  async getDataset(version: string = this.env.activeDatasetVersion): Promise<DatasetSnapshot> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('dataset_versions')
        .select('*')
        .eq('version_key', version)
        .eq('state', 'published')
        .maybeSingle();

      if (error || !data) {
        throw new AppError(503, 'DATASET_UNAVAILABLE', 'অনুরোধকৃত ডেটাসেট সংস্করণ পাওয়া যায়নি বা অপ্রকাশিত।');
      }
      return syntheticDatasetV2;
    }

    this.checkProductionSupabase();

    if (version !== 'synthetic-v2') {
      throw new AppError(503, 'DATASET_UNAVAILABLE', 'অনুরোধকৃত ডেটাসেট সংস্করণ পাওয়া যায়নি বা অপ্রকাশিত।');
    }
    return syntheticDatasetV2;
  }

  async getScenarios(): Promise<typeof syntheticScenarios> {
    return syntheticScenarios;
  }

  async getCitizens(): Promise<Array<{ id: string; label: string }>> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('citizens')
        .select('code, label_bn')
        .order('code');

      if (!error && data && data.length > 0) {
        return data.map((c: { code: string; label_bn: string }) => ({ id: c.code, label: c.label_bn }));
      }
    }

    this.checkProductionSupabase();
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
    if (this.supabase) {
      let query = this.supabase
        .from('khatians')
        .select(`
          id, khatian_no,
          parcel:parcels!inner(
            id, dag_no, survey, area_shotok, land_class
          ),
          owner:citizens(code, label_bn)
        `, { count: 'exact' });

      if (params.survey) {
        query = query.eq('parcel.survey', params.survey);
      }
      if (params.dag_no) {
        query = query.eq('parcel.dag_no', params.dag_no);
      }
      if (params.khatian_no) {
        query = query.eq('khatian_no', params.khatian_no);
      }

      query = query.range(params.offset, params.offset + params.limit - 1);
      const { data, count, error } = await query;
      if (!error && data) {
        const items: ParcelRecord[] = data.map((k: any) => ({
          id: k.khatian_no,
          plot: k.parcel?.dag_no || '',
          survey: k.parcel?.survey || 'BS',
          ownerId: k.owner?.code || 'C01',
          owner: k.owner?.label_bn || '',
          area: Number(k.parcel?.area_shotok || 0),
          land: k.parcel?.land_class || 'আবাসিক',
          tax: 'হালনাগাদ',
          mutation: 'সম্পন্ন',
          district: params.district,
          upazila: params.upazila,
          mouza: params.mouza
        }));
        return { items, total: count || items.length };
      }
    }

    this.checkProductionSupabase();

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
    if (this.supabase) {
      let query = this.supabase
        .from('khatians')
        .select(`
          id, khatian_no,
          parcel:parcels!inner(
            id, dag_no, survey, area_shotok, land_class
          ),
          owner:citizens(code, label_bn)
        `)
        .or(`khatian_no.eq.${idOrKhatian},parcel.dag_no.eq.${idOrKhatian}`);

      if (survey) {
        query = query.eq('parcel.survey', survey);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data) {
        const k: any = data;
        return {
          id: k.khatian_no,
          plot: k.parcel?.dag_no || '',
          survey: k.parcel?.survey || 'BS',
          ownerId: k.owner?.code || 'C01',
          owner: k.owner?.label_bn || '',
          area: Number(k.parcel?.area_shotok || 0),
          land: k.parcel?.land_class || 'আবাসিক',
          tax: 'হালনাগাদ',
          mutation: 'সম্পন্ন',
          district: 'ঢাকা',
          upazila: 'সাভার',
          mouza
        };
      }
    }

    this.checkProductionSupabase();

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
    if (this.supabase) {
      const { data: mut, error } = await this.supabase
        .from('mutations')
        .select(`
          id, tracking_code, state, effective_date, stage, deed_id,
          parcel:parcels(dag_no, survey),
          owner:citizens(code, label_bn),
          events:mutation_events(stage, label_bn, occurred_at)
        `)
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      if (!error && mut) {
        const stages = [
          'আবেদন দাখিল',
          'প্রাথমিক যাচাই',
          'তদন্ত ও প্রতিবেদন',
          'শুনানি',
          'খতিয়ান অনুমোদন ও DCR'
        ];
        const m: any = mut;
        return {
          tracking_code: m.tracking_code,
          plot: m.parcel?.dag_no || '1204',
          survey: m.parcel?.survey || 'BS',
          owner_id: m.owner?.code || 'C02',
          status: m.state,
          stage: m.stage,
          stage_label: stages[m.stage] || stages[0],
          submitted_at: m.effective_date,
          desk: 'নমুনা ভূমি রাজস্ব ডেস্ক',
          days_elapsed: 10,
          hearing: m.stage >= 3 ? 'সম্পন্ন' : 'অপেক্ষমাণ',
          deed_id: m.deed_id,
          source: 'Supabase Registry'
        };
      }
    }

    this.checkProductionSupabase();

    const ds = await this.getDataset();
    const foundMut = ds.mutations.find(m => m.id.toUpperCase() === trackingCode.toUpperCase());
    if (!foundMut) return null;

    const details = syntheticMutationCasesDetails[foundMut.id] || {
      stage: foundMut.status === 'completed' ? 4 : 2,
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
      tracking_code: foundMut.id,
      plot: foundMut.plot,
      survey: foundMut.survey || 'BS',
      owner_id: foundMut.ownerId,
      status: foundMut.status,
      stage: details.stage,
      stage_label: stages[details.stage],
      submitted_at: details.submitted,
      desk: details.desk,
      days_elapsed: details.days,
      hearing: details.hearing,
      deed_id: foundMut.deedId,
      source: foundMut.source
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
      : null;

    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('create_verification_report_v1', {
        p_owner_uid: ownerUid,
        p_dataset_version: result.datasetVersion,
        p_record_id: result.record.id,
        p_seller_id: result.sellerId || null,
        p_rules_version: result.rulesVersion,
        p_outcome: result.outcome,
        p_snapshot: result,
        p_snapshot_sha256: result.snapshotSha256,
        p_idempotency_key: idempotencyKey || null,
        p_request_sha256: bodyDigest
      });

      if (error) {
        if (error.message && error.message.includes('IDEMPOTENCY_CONFLICT')) {
          throw new AppError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'একই Idempotency-Key ভিন্ন পে-লোডের সাথে পুনরায় ব্যবহার করা হয়েছে।'
          );
        }
        throw new AppError(500, 'DATABASE_ERROR', `রিপোর্ট সংরক্ষণ ব্যর্থ: ${error.message}`);
      }

      return {
        report: data.report as VerificationResult,
        id: data.id,
        replayed: data.replayed
      };
    }

    this.checkProductionSupabase();

    // In-memory test store (only active when NODE_ENV === 'test')
    if (idempotencyKey) {
      const compositeKey = `${ownerUid}:${idempotencyKey}`;
      const existingKey = inMemoryIdempotency.get(compositeKey);
      if (existingKey) {
        if (existingKey.requestSha256 !== (bodyDigest || '')) {
          throw new AppError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'একই Idempotency-Key ভিন্ন পে-লোডের সাথে পুনরায় ব্যবহার করা হয়েছে।'
          );
        }
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

    inMemoryReports.set(reportId, stored);

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
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('reports')
        .select('id, record_id, outcome, snapshot, dataset_id, created_at')
        .eq('owner_uid', ownerUid)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AppError(500, 'DATABASE_ERROR', `রিপোর্ট তালিকা পড়তে ব্যর্থ: ${error.message}`);
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        record: r.snapshot.record,
        outcome: r.outcome,
        counts: r.snapshot.counts,
        generatedAt: r.snapshot.generatedAt || r.created_at,
        datasetVersion: r.snapshot.datasetVersion || 'synthetic-v2'
      }));
    }

    this.checkProductionSupabase();

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
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('reports')
        .select('snapshot')
        .eq('id', reportId)
        .eq('owner_uid', ownerUid)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data.snapshot as VerificationResult;
    }

    this.checkProductionSupabase();

    const rep = inMemoryReports.get(reportId);
    if (!rep || rep.ownerUid !== ownerUid) {
      return null;
    }
    return rep.snapshot;
  }

  async listDrafts(ownerUid: string): Promise<StoredDraft[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('drafts')
        .select('id, owner_uid, client_draft_id, revision, body, created_at, updated_at')
        .eq('owner_uid', ownerUid)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new AppError(500, 'DATABASE_ERROR', `খসড়া তালিকা পড়তে ব্যর্থ: ${error.message}`);
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        ownerUid: d.owner_uid,
        clientDraftId: d.client_draft_id,
        revision: d.revision,
        body: d.body,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    }

    this.checkProductionSupabase();

    const drafts: StoredDraft[] = [];
    for (const d of inMemoryDrafts.values()) {
      if (d.ownerUid === ownerUid) {
        drafts.push(d);
      }
    }
    return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getDraftById(ownerUid: string, draftId: string): Promise<StoredDraft | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('drafts')
        .select('id, owner_uid, client_draft_id, revision, body, created_at, updated_at')
        .eq('owner_uid', ownerUid)
        .or(`id.eq.${draftId},client_draft_id.eq.${draftId}`)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        ownerUid: data.owner_uid,
        clientDraftId: data.client_draft_id,
        revision: data.revision,
        body: data.body,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    this.checkProductionSupabase();

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
    if (this.supabase) {
      const { data: existing, error: findErr } = await this.supabase
        .from('drafts')
        .select('id, revision, body')
        .eq('owner_uid', ownerUid)
        .eq('client_draft_id', clientDraftId)
        .maybeSingle();

      if (findErr) {
        throw new AppError(500, 'DATABASE_ERROR', `খসড়া অনুসন্ধান ব্যর্থ: ${findErr.message}`);
      }

      if (existing) {
        if (existing.revision !== expectedRevision) {
          throw new AppError(
            409,
            'DRAFT_CONFLICT',
            `খসড়ার সংস্করণ অসঙ্গতি। বর্তমান সংস্করণ: ${existing.revision}, অনুরোধকৃত: ${expectedRevision}`
          );
        }

        const { data: updated, error: updateErr } = await this.supabase
          .from('drafts')
          .update({
            revision: existing.revision + 1,
            body,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .eq('revision', existing.revision)
          .select('id, owner_uid, client_draft_id, revision, body, created_at, updated_at')
          .maybeSingle();

        if (updateErr || !updated) {
          throw new AppError(
            409,
            'DRAFT_CONFLICT',
            'খসড়া যুগপৎভাবে পরিবর্তিত হয়েছে (Concurrent modification conflict)।'
          );
        }

        return {
          id: updated.id,
          ownerUid: updated.owner_uid,
          clientDraftId: updated.client_draft_id,
          revision: updated.revision,
          body: updated.body,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at
        };
      }

      // Insert new revision 1
      const { data: created, error: insertErr } = await this.supabase
        .from('drafts')
        .insert({
          owner_uid: ownerUid,
          client_draft_id: clientDraftId,
          revision: 1,
          body
        })
        .select('id, owner_uid, client_draft_id, revision, body, created_at, updated_at')
        .single();

      if (insertErr || !created) {
        throw new AppError(500, 'DATABASE_ERROR', `খসড়া সংরক্ষণ ব্যর্থ: ${insertErr?.message}`);
      }

      return {
        id: created.id,
        ownerUid: created.owner_uid,
        clientDraftId: created.client_draft_id,
        revision: created.revision,
        body: created.body,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };
    }

    this.checkProductionSupabase();

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
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('drafts')
        .delete()
        .eq('owner_uid', ownerUid)
        .or(`id.eq.${draftId},client_draft_id.eq.${draftId}`)
        .select('id');

      if (error) {
        throw new AppError(500, 'DATABASE_ERROR', `খসড়া মোছা ব্যর্থ: ${error.message}`);
      }
      return !!(data && data.length > 0);
    }

    this.checkProductionSupabase();

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
