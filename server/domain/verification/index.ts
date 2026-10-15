import crypto from 'node:crypto';

export type CheckState = 'pass' | 'fail' | 'unknown';
export type ReportOutcome = 'consistent' | 'attention' | 'incomplete';

export interface VerificationCheck {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  evidence: string[];
}

export interface ParcelRecord {
  id: string;
  plot: string;
  survey: string;
  ownerId: string;
  owner?: string;
  area: number;
  land?: string;
  tax?: string;
  mutation?: string;
  district?: string;
  upazila?: string;
  mouza?: string;
}

export interface DeedRecord {
  id: string;
  plot: string;
  survey?: string;
  mouza?: string;
  sellerId: string;
  buyerId: string;
  date: string;
  area: number;
  areaScope: 'full' | 'partial' | 'unknown';
  status: 'registered' | 'cancelled';
  source: string;
}

export interface MutationRecord {
  id: string;
  plot: string;
  survey?: string;
  mouza?: string;
  ownerId: string;
  status: 'pending' | 'completed' | 'rejected' | 'unknown';
  deedId: string;
  date: string;
  source: string;
}

export interface LandStatusRecord {
  id: string;
  plot: string;
  survey?: string;
  mouza?: string;
  pendingCases: Array<{ id: string; state: 'pending' | 'resolved'; label: string }> | null;
  mortgage: boolean | null;
  khas: boolean | null;
  vested: boolean | null;
  acquisition: boolean | null;
  taxPaid: boolean | null;
  source: string;
}

export interface DatasetSnapshot {
  version: string;
  asOf: string;
  evaluationDate?: string;
  citizens: Array<{ id: string; label: string }>;
  records: ParcelRecord[];
  transfers: DeedRecord[];
  mutations: MutationRecord[];
  status: LandStatusRecord[];
}

export interface VerificationResult {
  record: ParcelRecord;
  sellerId: string | null;
  checks: VerificationCheck[];
  counts: { pass: number; fail: number; unknown: number };
  outcome: ReportOutcome;
  deeds: DeedRecord[];
  mutations: MutationRecord[];
  status: LandStatusRecord | null;
  conflicts: string[][];
  scopeKey: string;
  datasetVersion: string;
  rulesVersion: string;
  asOf: string;
  generatedAt: string;
  disclaimer: string;
  snapshotSha256: string;
}

export function scopeKey(r: { district?: string; upazila?: string; mouza?: string; survey?: string; plot: string }): string {
  return [r.district || 'ঢাকা', r.upazila || 'সাভার', r.mouza || 'আশুলিয়া', r.survey || '', String(r.plot)].join('|');
}

export function plotMatch(
  a: { district?: string; upazila?: string; mouza?: string; survey?: string; plot: string },
  b: { district?: string; upazila?: string; mouza?: string; survey?: string; plot: string }
): boolean {
  return scopeKey(a) === scopeKey(b);
}

export function evaluateVerification(
  record: ParcelRecord,
  sellerId: string | null,
  dataset: DatasetSnapshot,
  rulesVersion: string = 'v1'
): VerificationResult {
  const deeds = dataset.transfers
    .filter(t => plotMatch(t, record) && t.status === 'registered')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const muts = dataset.mutations
    .filter(m => plotMatch(m, record))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const status = dataset.status.find(s => plotMatch(s, record)) || null;

  const latestDeed = deeds.length > 0 ? deeds[deeds.length - 1] : undefined;
  const latestMut = muts.length > 0 ? muts[muts.length - 1] : undefined;

  const checks: VerificationCheck[] = [];
  const add = (id: string, label: string, state: CheckState, detail: string, evidence: string[] = []) => {
    checks.push({ id, label, state, detail, evidence });
  };

  // 1. Seller check
  if (!sellerId) {
    add('seller', 'প্রস্তাবিত বিক্রেতা ↔ খতিয়ান', 'unknown', 'প্রস্তাবিত বিক্রেতা নির্বাচন করা হয়নি।', [`খতিয়ান ${record.id} (${record.survey})`]);
  } else if (record.ownerId === sellerId) {
    add('seller', 'প্রস্তাবিত বিক্রেতা ↔ খতিয়ান', 'pass', 'ডেমো বিক্রেতার পরিচয় খতিয়ানের রেকর্ডীয় পরিচয়ের সঙ্গে মিলে।', [`খতিয়ান ${record.id} (${record.survey})`, `ডেমো পরিচয় ${sellerId}`]);
  } else {
    add('seller', 'প্রস্তাবিত বিক্রেতা ↔ খতিয়ান', 'fail', 'ডেমো বিক্রেতার পরিচয় রেকর্ডীয় পরিচয়ের সঙ্গে মেলে না।', [`খতিয়ান ${record.id} (${record.survey})`, `ডেমো পরিচয় ${sellerId}`]);
  }

  // 2. Deed-owner check
  if (!latestDeed) {
    add('deed-owner', 'দলিলের ক্রেতা ↔ খতিয়ান', 'unknown', 'এই প্লটের দলিলের তথ্য নেই।', []);
  } else if (latestDeed.buyerId === record.ownerId) {
    add('deed-owner', 'দলিলের ক্রেতা ↔ খতিয়ান', 'pass', 'সর্বশেষ কৃত্রিম দলিলের ক্রেতা ও খতিয়ানের পরিচয় একই।', [latestDeed.id, `খতিয়ান ${record.id}`]);
  } else {
    add('deed-owner', 'দলিলের ক্রেতা ↔ খতিয়ান', 'fail', 'সর্বশেষ কৃত্রিম দলিলের ক্রেতা খতিয়ানের পরিচয় থেকে আলাদা।', [latestDeed.id, `খতিয়ান ${record.id}`]);
  }

  // 3. Mutation check
  let mutState: CheckState = 'unknown';
  let mutDetail = 'নামজারি রেকর্ড নেই।';
  if (!latestMut) {
    mutState = 'unknown';
    mutDetail = 'নামজারি রেকর্ড নেই।';
  } else if (!latestDeed) {
    mutState = 'unknown';
    mutDetail = 'দলিল নেই; নামজারি মিল যাচাই করা যায়নি।';
  } else if (latestMut.status !== 'completed') {
    mutState = 'fail';
    mutDetail = 'নামজারি এখনো চলমান; রেজিস্ট্রেশনের সঙ্গে সম্পূর্ণ মিল নিশ্চিত হয়নি।';
  } else if (latestMut.ownerId !== latestDeed.buyerId || latestMut.deedId !== latestDeed.id) {
    mutState = 'fail';
    mutDetail = 'সম্পন্ন নামজারির দলিল বা পরিচয়ে অমিল।';
  } else {
    mutState = 'pass';
    mutDetail = 'সম্পন্ন নামজারি একই দলিল ও ক্রেতার সঙ্গে যুক্ত।';
  }
  add('mutation', 'দলিল ↔ নামজারি', mutState, mutDetail, [
    ...(latestDeed ? [latestDeed.id] : []),
    ...(latestMut ? [latestMut.id] : [])
  ]);

  // 4. Double-sale / Chain continuity
  const conflicts: string[][] = [];
  let hasPartialOrAmbiguous = false;

  for (let i = 0; i < deeds.length; i++) {
    if (deeds[i].areaScope !== 'full') {
      hasPartialOrAmbiguous = true;
    }
    for (let j = i + 1; j < deeds.length; j++) {
      const a = deeds[i];
      const b = deeds[j];
      if (a.areaScope === 'full' && b.areaScope === 'full' && a.sellerId === b.sellerId && a.buyerId !== b.buyerId) {
        // Check for intervening reacquisition: did seller 'a.sellerId' buy the property back between i and j?
        const reacquired = deeds.slice(i + 1, j).some(t => t.buyerId === a.sellerId);
        if (!reacquired) {
          conflicts.push([a.id, b.id]);
        }
      }
    }
  }

  const chainBreaks = deeds.slice(1).filter((t, i) => t.sellerId !== deeds[i].buyerId);

  let doubleSaleState: CheckState = 'pass';
  let doubleSaleDetail = 'উপলব্ধ নমুনা হস্তান্তরে ধারাবাহিকতার অমিল পাওয়া যায়নি।';
  const doubleSaleEvidence: string[] = [];

  if (deeds.length === 0) {
    doubleSaleState = 'unknown';
    doubleSaleDetail = 'হস্তান্তরের ইতিহাস নেই।';
  } else if (conflicts.length > 0) {
    doubleSaleState = 'fail';
    doubleSaleDetail = 'একই বিক্রেতা পুনরায় মালিকানা পাওয়ার রেকর্ড ছাড়া একই পূর্ণ প্লট পৃথক ক্রেতাকে হস্তান্তর করেছেন—সম্ভাব্য দ্বৈত বিক্রির সংকেত।';
    doubleSaleEvidence.push(...Array.from(new Set(conflicts.flat())));
  } else if (chainBreaks.length > 0) {
    doubleSaleState = 'fail';
    doubleSaleDetail = 'পরের দলিলের বিক্রেতা আগের দলিলের ক্রেতার সঙ্গে মেলে না।';
    doubleSaleEvidence.push(...chainBreaks.map(t => t.id));
  } else if (hasPartialOrAmbiguous) {
    doubleSaleState = 'unknown';
    doubleSaleDetail = 'আংশিক বা অস্পষ্ট হস্তান্তরের জন্য সম্পূর্ণ চেইন বিশ্লেষণ অসমর্থিত।';
  } else {
    doubleSaleState = 'pass';
    doubleSaleEvidence.push(...deeds.map(t => t.id));
  }

  add('double-sale', 'একই প্লটের হস্তান্তর ধারাবাহিকতা', doubleSaleState, doubleSaleDetail, doubleSaleEvidence);

  // 5. Land status checks (mortgage, khas, vested, acquisition)
  const statusItems: Array<[keyof LandStatusRecord, string, string, string]> = [
    ['mortgage', 'mortgage', 'বন্ধক / দায়', 'নমুনা রেজিস্ট্রিতে সক্রিয় বন্ধক আছে।'],
    ['khas', 'khas', 'খাস জমি', 'নমুনা রেজিস্ট্রিতে খাস হিসেবে চিহ্নিত।'],
    ['vested', 'vested', 'অর্পিত সম্পত্তি', 'নমুনা রেজিস্ট্রিতে অর্পিত হিসেবে চিহ্নিত।'],
    ['acquisition', 'acquisition', 'অধিগ্রহণ', 'নমুনা রেজিস্ট্রিতে অধিগ্রহণের চিহ্ন আছে।']
  ];

  for (const [field, id, label, reason] of statusItems) {
    const val = status ? status[field] : null;
    let sState: CheckState = 'unknown';
    let sDetail = 'এই বিষয়ে তথ্য নেই; ঝুঁকিমুক্ত বলা যায় না।';
    if (val === true) {
      sState = 'fail';
      sDetail = reason;
    } else if (val === false) {
      sState = 'pass';
      sDetail = 'নমুনা রেজিস্ট্রিতে এই চিহ্ন নেই।';
    }
    add(id, label, sState, sDetail, status ? [status.id] : []);
  }

  // 6. Court cases
  const litigation = status?.pendingCases;
  let casesState: CheckState = 'unknown';
  let casesDetail = 'মামলার তথ্য নেই।';
  const casesEvidence: string[] = [];

  if (Array.isArray(litigation)) {
    if (litigation.some(c => c.state === 'pending')) {
      casesState = 'fail';
      casesDetail = 'নমুনায় চলমান মামলা পাওয়া গেছে।';
    } else {
      casesState = 'pass';
      casesDetail = 'উপলব্ধ নমুনায় চলমান মামলা নেই।';
    }
    if (status) casesEvidence.push(status.id);
    casesEvidence.push(...litigation.map(c => c.id));
  } else {
    casesState = 'unknown';
    casesDetail = 'মামলার তথ্য নেই; ঝুঁকিমুক্ত নিশ্চিত করা যায় না।';
  }
  add('cases', 'চলমান মামলা', casesState, casesDetail, casesEvidence);

  // 7. Land Development Tax
  const taxPaid = status?.taxPaid;
  let taxState: CheckState = 'unknown';
  let taxDetail = 'করের তথ্য নেই।';
  if (taxPaid === true) {
    taxState = 'pass';
    taxDetail = 'নমুনায় কর হালনাগাদ।';
  } else if (taxPaid === false) {
    taxState = 'fail';
    taxDetail = 'নমুনায় কর বকেয়া।';
  } else {
    taxState = 'unknown';
    taxDetail = 'করের তথ্য নেই।';
  }
  add('tax', 'কর / দাখিলা', taxState, taxDetail, status ? [status.id] : []);

  // Compute counts and tri-state outcome
  const counts = {
    pass: checks.filter(c => c.state === 'pass').length,
    fail: checks.filter(c => c.state === 'fail').length,
    unknown: checks.filter(c => c.state === 'unknown').length
  };

  const outcome: ReportOutcome = counts.fail > 0 ? 'attention' : counts.unknown > 0 ? 'incomplete' : 'consistent';

  const generatedAt = new Date().toISOString();
  const disclaimer = 'সম্পূর্ণ কৃত্রিম ডেটার প্রতিবেদন; সরকারি রেকর্ড, মালিকানার নিশ্চয়তা বা লেনদেন অনুমোদন নয়।';

  // Snapshot digest calculation
  const canonicalData = JSON.stringify({
    record,
    sellerId,
    checks,
    counts,
    outcome,
    deeds,
    mutations: muts,
    status,
    scopeKey: scopeKey(record),
    datasetVersion: dataset.version,
    rulesVersion
  });
  const snapshotSha256 = crypto.createHash('sha256').update(canonicalData, 'utf8').digest('hex');

  return {
    record,
    sellerId,
    checks,
    counts,
    outcome,
    deeds,
    mutations: muts,
    status,
    conflicts,
    scopeKey: scopeKey(record),
    datasetVersion: dataset.version,
    rulesVersion,
    asOf: dataset.asOf,
    generatedAt,
    disclaimer,
    snapshotSha256
  };
}
