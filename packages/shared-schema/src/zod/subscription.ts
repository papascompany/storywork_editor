import { z } from 'zod'

// ─────────────────────────────────────────────
// Subscription — Stripe 구독 정보
// ─────────────────────────────────────────────

export const SubscriptionSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  plan: z.string().min(1),
  status: z.string().min(1),
  currentPeriodEnd: z.coerce.date(),
  uploadQuotaMb: z.number().int().nonnegative().default(100),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Subscription = z.infer<typeof SubscriptionSchema>
