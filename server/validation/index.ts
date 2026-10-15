import { z } from 'zod';

export function normalizeBengaliDigits(input: string): string {
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return input.normalize('NFC').replace(/[০-৯]/g, d => bnToEnMap[d] || d).trim();
}

export const SurveyEnum = z.enum(['CS', 'SA', 'RS', 'BS', 'BRS']);

export const SearchRecordsQuerySchema = z.object({
  district: z.string().min(1).default('ঢাকা'),
  upazila: z.string().min(1).default('সাভার'),
  mouza: z.string().min(1).default('আশুলিয়া'),
  survey: SurveyEnum.optional(),
  khatian_no: z.string().transform(normalizeBengaliDigits).optional(),
  dag_no: z.string().transform(normalizeBengaliDigits).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0)
}).strict();

export const CreateVerificationBodySchema = z.object({
  record_id: z.string().min(1),
  seller_id: z.string().min(1).optional(),
  survey: SurveyEnum.optional(),
  mouza: z.string().optional()
}).strict();

export const SaveDraftBodySchema = z.object({
  client_draft_id: z.string().uuid().or(z.string().min(1).max(64)),
  revision: z.number().int().min(1).default(1),
  body: z.record(z.unknown()).refine(val => {
    // 32 KiB payload max bound
    const size = Buffer.byteLength(JSON.stringify(val), 'utf8');
    return size <= 32 * 1024;
  }, { message: 'Draft body exceeds 32 KiB limit' })
}).strict();

export const MutationTrackingParamsSchema = z.object({
  trackingCode: z.string().transform(normalizeBengaliDigits).transform(s => s.toUpperCase())
});
