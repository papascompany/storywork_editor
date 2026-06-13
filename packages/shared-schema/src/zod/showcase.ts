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

// ─────────────────────────────────────────────
// Report (신고 큐 — BOARD-07)
// ─────────────────────────────────────────────

export const ReportTargetTypeSchema = z.enum(['showcase', 'comment'])
export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>

export const ReportReasonSchema = z.enum([
  'spam',
  'abuse',
  'sexual',
  'violence',
  'copyright',
  'etc',
])
export type ReportReason = z.infer<typeof ReportReasonSchema>

export const ReportStatusSchema = z.enum(['pending', 'reviewing', 'resolved', 'dismissed'])
export type ReportStatus = z.infer<typeof ReportStatusSchema>

/** 공개 신고 접수 입력 (POST /api/reports) */
export const CreateReportSchema = z.object({
  targetType: ReportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: ReportReasonSchema,
  detail: z.string().max(1000).optional(),
})
export type CreateReport = z.infer<typeof CreateReportSchema>

/** admin 신고 처리 입력 (PATCH /api/admin/reports/[id]) */
export const UpdateReportSchema = z.object({
  status: ReportStatusSchema.optional(),
  resolution: z.string().max(1000).optional(),
  /** 'hide' = 대상 숨김 처리 후 resolved, 'dismiss' = 기각 */
  action: z.enum(['hide', 'dismiss', 'reviewing']).optional(),
})
export type UpdateReport = z.infer<typeof UpdateReportSchema>

/** 사유 한글 라벨 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: '스팸/광고',
  abuse: '욕설/괴롭힘',
  sexual: '음란물',
  violence: '폭력/혐오',
  copyright: '저작권 침해',
  etc: '기타',
}
