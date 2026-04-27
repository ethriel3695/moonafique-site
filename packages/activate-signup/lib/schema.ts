import { z } from 'zod';

export const signupCategorySchema = z.enum([
  'meals',
  'cleanup',
  'concessions',
  'donations',
]);

export const signupSlotTypeSchema = z.enum(['meal', 'volunteer', 'donation']);

export const signupRowConfigSchema = z.object({
  id: z.string(),
  category: signupCategorySchema,
  type: signupSlotTypeSchema,
  title: z.string(),
  summary: z.string(),
  details: z.array(z.string()).default([]),
  dateLabel: z.string().optional(),
  capacity: z.number().int().positive(),
  unitLabel: z.string(),
  noteHint: z.string().optional(),
});

export const signupLaneSchema = z.object({
  id: signupCategorySchema,
  title: z.string(),
  shortTitle: z.string(),
  description: z.string(),
  emphasis: z.string(),
  rows: z.array(signupRowConfigSchema),
});

export const productionConfigSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  seasonLabel: z.string(),
  venue: z.string(),
  blurb: z.string(),
  coverageNote: z.string(),
  organizerSummary: z.string(),
  lanes: z.array(signupLaneSchema),
});

export const seasonConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  activeProductionSlug: z.string(),
  productions: z.array(productionConfigSchema),
});

const optionalEmailSchema = z
  .union([z.literal(''), z.string().email()])
  .transform((value) => value || undefined);

export const signupClaimInputSchema = z.object({
  slotId: z.string(),
  parentName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  email: optionalEmailSchema.optional(),
  quantity: z.number().int().min(1).max(12),
  notes: z.string().trim().max(500).optional(),
});

export const storedSignupClaimSchema = z.object({
  id: z.string(),
  productionSlug: z.string(),
  slotId: z.string(),
  category: signupCategorySchema,
  parentName: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const publicBoardRowSchema = signupRowConfigSchema.extend({
  claimedCount: z.number().int().nonnegative(),
  remainingCount: z.number().int().nonnegative(),
  isFull: z.boolean(),
});

export const publicBoardLaneSchema = signupLaneSchema.extend({
  rows: z.array(publicBoardRowSchema),
});

export const publicBoardSchema = z.object({
  production: productionConfigSchema.omit({ lanes: true }),
  lanes: z.array(publicBoardLaneSchema),
  updatedAt: z.string(),
});

export const organizerSummaryRowSchema = publicBoardRowSchema.extend({
  claims: z.array(storedSignupClaimSchema),
});

export const organizerSummaryLaneSchema = signupLaneSchema.extend({
  rows: z.array(organizerSummaryRowSchema),
});

export const organizerSummarySchema = z.object({
  production: productionConfigSchema.omit({ lanes: true }),
  lanes: z.array(organizerSummaryLaneSchema),
  totals: z.object({
    claims: z.number().int().nonnegative(),
    people: z.number().int().nonnegative(),
  }),
  updatedAt: z.string(),
});

export type SignupCategory = z.infer<typeof signupCategorySchema>;
export type SignupClaimInput = {
  slotId: string;
  parentName: string;
  phone: string;
  email?: string;
  quantity: number;
  notes?: string;
};
export type SignupLane = z.infer<typeof signupLaneSchema>;
export type SignupRowConfig = z.infer<typeof signupRowConfigSchema>;
export type StoredSignupClaim = z.infer<typeof storedSignupClaimSchema>;
export type PublicBoard = z.infer<typeof publicBoardSchema>;
export type PublicBoardLane = z.infer<typeof publicBoardLaneSchema>;
export type PublicBoardRow = z.infer<typeof publicBoardRowSchema>;
export type ProductionConfig = z.infer<typeof productionConfigSchema>;
export type OrganizerSummary = z.infer<typeof organizerSummarySchema>;