import type { DatasetSnapshot } from '../domain/verification/index.js';

const base = {
  division: 'ঢাকা',
  district: 'ঢাকা',
  upazila: 'সাভার',
  mouza: 'আশুলিয়া'
};

export const syntheticCitizens = [
  { id: 'C01', label: 'ডেমো নাগরিক C01' },
  { id: 'C02', label: 'ডেমো নাগরিক C02' },
  { id: 'C03', label: 'ডেমো নাগরিক C03' },
  { id: 'C04', label: 'ডেমো নাগরিক C04' },
  { id: 'C05', label: 'ডেমো নাগরিক C05' },
  { id: 'C06', label: 'ডেমো নাগরিক C06' }
];

export const syntheticDatasetV2: DatasetSnapshot = {
  version: 'synthetic-v2',
  asOf: '2026-10-13',
  evaluationDate: '2026-10-13',
  citizens: syntheticCitizens,
  records: [
    {
      ...base,
      id: '1234',
      plot: '1204',
      survey: 'BS',
      ownerId: 'C02',
      owner: 'ডেমো নাগরিক C02',
      area: 8.75,
      land: 'আবাসিক',
      tax: 'হালনাগাদ',
      mutation: 'সম্পন্ন'
    },
    {
      ...base,
      id: '5678',
      plot: '1205',
      survey: 'RS',
      ownerId: 'C03',
      owner: 'ডেমো নাগরিক C03',
      area: 10.2,
      land: 'কৃষি',
      tax: 'বকেয়া',
      mutation: 'চলমান'
    },
    {
      ...base,
      id: '9012',
      plot: '1206',
      survey: 'BS',
      ownerId: 'C05',
      owner: 'ডেমো নাগরিক C05',
      area: 6.5,
      land: 'কৃষি',
      tax: 'হালনাগাদ',
      mutation: 'সম্পন্ন'
    },
    {
      ...base,
      id: '3456',
      plot: '1207',
      survey: 'BS',
      ownerId: 'C06',
      owner: 'ডেমো নাগরিক C06',
      area: 12,
      land: 'আবাসিক',
      tax: 'অজানা',
      mutation: 'অজানা'
    }
  ],
  transfers: [
    {
      ...base,
      id: 'DEMO-D001',
      plot: '1204',
      survey: 'BS',
      sellerId: 'C01',
      buyerId: 'C02',
      date: '2025-04-10',
      area: 8.75,
      areaScope: 'full',
      status: 'registered',
      source: 'কৃত্রিম দলিল রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'DEMO-D002',
      plot: '1205',
      survey: 'RS',
      sellerId: 'C01',
      buyerId: 'C03',
      date: '2025-06-01',
      area: 10.2,
      areaScope: 'full',
      status: 'registered',
      source: 'কৃত্রিম দলিল রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'DEMO-D003',
      plot: '1205',
      survey: 'RS',
      sellerId: 'C01',
      buyerId: 'C04',
      date: '2025-06-05',
      area: 10.2,
      areaScope: 'full',
      status: 'registered',
      source: 'কৃত্রিম দলিল রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'DEMO-D004',
      plot: '1206',
      survey: 'BS',
      sellerId: 'C01',
      buyerId: 'C05',
      date: '2025-02-15',
      area: 6.5,
      areaScope: 'full',
      status: 'registered',
      source: 'কৃত্রিম দলিল রেজিস্ট্রি'
    }
  ],
  mutations: [
    {
      ...base,
      id: 'MUT-2026-1021',
      plot: '1204',
      survey: 'BS',
      ownerId: 'C02',
      status: 'completed',
      deedId: 'DEMO-D001',
      date: '2026-10-12',
      source: 'কৃত্রিম নামজারি রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'MUT-2026-8849',
      plot: '1205',
      survey: 'RS',
      ownerId: 'C03',
      status: 'pending',
      deedId: 'DEMO-D002',
      date: '2026-10-06',
      source: 'কৃত্রিম নামজারি রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'MUT-DEMO-1206',
      plot: '1206',
      survey: 'BS',
      ownerId: 'C05',
      status: 'completed',
      deedId: 'DEMO-D004',
      date: '2025-03-01',
      source: 'কৃত্রিম নামজারি রেজিস্ট্রি'
    }
  ],
  status: [
    {
      ...base,
      id: 'DEMO-S1204',
      plot: '1204',
      survey: 'BS',
      pendingCases: [],
      mortgage: false,
      khas: false,
      vested: false,
      acquisition: false,
      taxPaid: true,
      source: 'কৃত্রিম মামলা/দায়/সরকারি-জমি রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'DEMO-S1205',
      plot: '1205',
      survey: 'RS',
      pendingCases: [{ id: 'DEMO-CASE-07', state: 'pending', label: 'মালিকানা বিরোধ · কৃত্রিম' }],
      mortgage: true,
      khas: false,
      vested: false,
      acquisition: false,
      taxPaid: false,
      source: 'কৃত্রিম মামলা/দায়/সরকারি-জমি রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'DEMO-S1206',
      plot: '1206',
      survey: 'BS',
      pendingCases: [],
      mortgage: false,
      khas: true,
      vested: false,
      acquisition: true,
      taxPaid: true,
      source: 'কৃত্রিম মামলা/দায়/সরকারি-জমি রেজিস্ট্রি'
    },
    {
      ...base,
      id: 'DEMO-S1207',
      plot: '1207',
      survey: 'BS',
      pendingCases: null,
      mortgage: null,
      khas: null,
      vested: null,
      acquisition: null,
      taxPaid: null,
      source: 'কৃত্রিম অসম্পূর্ণ রেজিস্ট্রি'
    }
  ]
};

export const syntheticScenarios = [
  {
    record: '1234',
    survey: 'BS',
    sellerId: 'C02',
    label: 'রেকর্ডে মিল',
    summary: 'দলিল ও নামজারি মিলে; পরিচিত সূচকে সতর্কতা নেই।'
  },
  {
    record: '5678',
    survey: 'RS',
    sellerId: 'C03',
    label: 'দ্বৈত বিক্রির সংকেত',
    summary: 'একই পূর্ণ প্লট একই বিক্রেতার কাছ থেকে দুই ক্রেতার নামে।'
  },
  {
    record: '9012',
    survey: 'BS',
    sellerId: 'C05',
    label: 'খাস / অধিগ্রহণ',
    summary: 'নমুনা রেজিস্ট্রিতে সরকারি জমি ও অধিগ্রহণের চিহ্ন।'
  },
  {
    record: '3456',
    survey: 'BS',
    sellerId: 'C06',
    label: 'তথ্য অসম্পূর্ণ',
    summary: 'মামলা, দায়, নামজারি ও দলিলের তথ্য অনুপস্থিত।'
  }
];

export const syntheticMutationCasesDetails: Record<string, { stage: number; submitted: string; desk: string; days: number; hearing: string }> = {
  'MUT-2026-8849': { stage: 2, submitted: '০৫ অক্টোবর ২০২৬', desk: 'নমুনা তদন্ত ডেস্ক', days: 8, hearing: 'নমুনায় এখনো নির্ধারিত হয়নি' },
  'MUT-2026-1021': { stage: 4, submitted: '১৫ সেপ্টেম্বর ২০২৬', desk: 'নমুনা অনুমোদন ডেস্ক', days: 28, hearing: 'নমুনা শুনানি সম্পন্ন' },
  'MUT-DEMO-1206': { stage: 4, submitted: '০১ মার্চ ২০২৫', desk: 'নমুনা অনুমোদন ডেস্ক', days: 45, hearing: 'নিষ্পন্ন' }
};
