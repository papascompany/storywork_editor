import { z } from 'zod'

import { OwnerTypeSchema, ResourceStatusSchema } from './enums.js'

// ─────────────────────────────────────────────
// Character — 여러 포즈를 묶는 캐릭터 단위
// ─────────────────────────────────────────────

export const CharacterSchema = z.object({
  id: z.string().cuid(),
  ownerType: OwnerTypeSchema,
  /// system 캐릭터는 null, creator 캐릭터는 User.id
  ownerId: z.string().cuid().nullable().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(1000).nullable().optional(),
  /// M / F / child / beast / 기타
  bodyType: z.string().min(1),
  /// "흑백 스케치", "수채화" 등 스타일 태그
  styleTag: z.string().max(100).nullable().optional(),
  thumbnail: z.string().url().nullable().optional(),
  status: ResourceStatusSchema.default('draft'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Character = z.infer<typeof CharacterSchema>

// ─────────────────────────────────────────────
// CharacterCreateSchema — id/timestamps 제외
// ─────────────────────────────────────────────

export const CharacterCreateSchema = CharacterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).superRefine((data, ctx) => {
  if (data.ownerType === 'creator' && !data.ownerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ownerId'],
      message: 'ownerType=creator 인 경우 ownerId 가 필수입니다.',
    })
  }
})
export type CharacterCreate = z.infer<typeof CharacterCreateSchema>

// ─────────────────────────────────────────────
// CharacterUpdateSchema — 모든 필드 선택
// ─────────────────────────────────────────────

export const CharacterUpdateSchema = CharacterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial()
export type CharacterUpdate = z.infer<typeof CharacterUpdateSchema>
