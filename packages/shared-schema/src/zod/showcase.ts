import { z } from 'zod'

import { ShowcaseModeSchema } from './enums.js'

// ─────────────────────────────────────────────
// Reaction
// ─────────────────────────────────────────────

export const ReactionKindSchema = z.enum(['like', 'heart', 'wow'])
export type ReactionKind = z.infer<typeof ReactionKindSchema>

export const ReactionSchema = z.object({
  id: z.string().cuid(),
  showcaseId: z.string().cuid(),
  userId: z.string().cuid(),
  kind: ReactionKindSchema,
  createdAt: z.coerce.date(),
})
export type Reaction = z.infer<typeof ReactionSchema>

// ─────────────────────────────────────────────
// ContestSeason
// ─────────────────────────────────────────────

export const ContestSeasonSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1).max(200),
    opensAt: z.coerce.date(),
    closesAt: z.coerce.date(),
    resultsAt: z.coerce.date().nullable().optional(),
    rules: z.string().min(1),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    if (data.closesAt <= data.opensAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['closesAt'],
        message: 'closesAt 은 opensAt 보다 이후여야 합니다.',
      })
    }
    if (data.resultsAt && data.resultsAt <= data.closesAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resultsAt'],
        message: 'resultsAt 은 closesAt 보다 이후여야 합니다.',
      })
    }
  })
export type ContestSeason = z.infer<typeof ContestSeasonSchema>

// ─────────────────────────────────────────────
// Showcase
// ─────────────────────────────────────────────

export const ShowcaseSchema = z
  .object({
    id: z.string().cuid(),
    projectId: z.string().cuid(),
    ownerId: z.string().cuid(),
    mode: ShowcaseModeSchema,
    contestId: z.string().cuid().nullable().optional(),
    likes: z.number().int().nonnegative().default(0),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    reactions: z.array(ReactionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'contest' && !data.contestId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contestId'],
        message: 'mode=contest 인 경우 contestId 가 필수입니다.',
      })
    }
  })
export type Showcase = z.infer<typeof ShowcaseSchema>
