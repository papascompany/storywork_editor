import { z } from 'zod'

// ─────────────────────────────────────────────
// AuditLog — 관리자 액션 감사 로그
// ─────────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: z.string().cuid(),
  actorId: z.string().cuid(),
  action: z.string().min(1).max(200),
  /// 'entity:id' 형식 예: 'resource:clxxx'
  target: z
    .string()
    .min(1)
    .regex(/^[a-z_]+:[a-zA-Z0-9_-]+$/, "target must be 'entity:id' format"),
  payload: z.record(z.string(), z.unknown()),
  at: z.coerce.date(),
})
export type AuditLog = z.infer<typeof AuditLogSchema>

export const CreateAuditLogSchema = AuditLogSchema.omit({ id: true })
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>
