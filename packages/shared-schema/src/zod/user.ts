/**
 * packages/shared-schema/src/zod/user.ts
 *
 * User 모델 Zod 스키마 — LEGAL-OPS-03 (회원 탈퇴/데이터 export)
 * 서버/클라이언트 공통 검증 계약.
 *
 * 원칙: Prisma 모델 → Zod → 클라이언트 타입 (단일 진실 원천)
 */

import { z } from 'zod'

// ─── 탈퇴 사유 enum ────────────────────────────────────────────────────────────

export const DeletionReasonSchema = z.enum(['비용', '사용성', '기능 부족', '기타'])
export type DeletionReason = z.infer<typeof DeletionReasonSchema>

// ─── 탈퇴 요청 body ───────────────────────────────────────────────────────────

export const AccountDeleteRequestSchema = z.object({
  /** 재인증 이메일 (본인 확인) */
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
  /** 재인증 비밀번호 */
  password: z.string().min(1, '비밀번호를 입력하세요.'),
  /** 탈퇴 사유 (선택) */
  reason: DeletionReasonSchema.optional(),
})

export type AccountDeleteRequest = z.infer<typeof AccountDeleteRequestSchema>

// ─── 마케팅 동의 토글 body ────────────────────────────────────────────────────

export const MarketingConsentUpdateSchema = z.object({
  consent: z.boolean(),
})

export type MarketingConsentUpdate = z.infer<typeof MarketingConsentUpdateSchema>

// ─── 데이터 export 응답 ───────────────────────────────────────────────────────

export const DataExportMetaSchema = z.object({
  exportedAt: z.string().datetime(),
  scope: z.array(z.string()),
  retentionInfo: z.string(),
  pipaRights: z.string(),
})

export type DataExportMeta = z.infer<typeof DataExportMetaSchema>

// ─── Admin 회원 복원 body ─────────────────────────────────────────────────────

export const AdminUserRestoreSchema = z.object({
  /** 복원 사유 (감사 로그용) */
  note: z.string().max(500).optional(),
})

export type AdminUserRestore = z.infer<typeof AdminUserRestoreSchema>

// ─── User 공개 뷰 (클라이언트 노출 안전) ─────────────────────────────────────

export const UserPublicViewSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: z.string(),
  marketingConsent: z.boolean(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
})

export type UserPublicView = z.infer<typeof UserPublicViewSchema>
