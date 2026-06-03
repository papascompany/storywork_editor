import { z } from 'zod'

// ─────────────────────────────────────────────
// InquiryStatus
// ─────────────────────────────────────────────

export const InquiryStatusSchema = z.enum(['OPEN', 'REPLIED', 'CLOSED'])
export type InquiryStatus = z.infer<typeof InquiryStatusSchema>

// ─────────────────────────────────────────────
// Notice
// ─────────────────────────────────────────────

export const NoticeSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  isPinned: z.boolean().default(false),
  /** null 이면 draft (미게시) */
  publishedAt: z.coerce.date().nullable().optional(),
  authorId: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Notice = z.infer<typeof NoticeSchema>

export const CreateNoticeSchema = NoticeSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateNotice = z.infer<typeof CreateNoticeSchema>

export const UpdateNoticeSchema = CreateNoticeSchema.partial()
export type UpdateNotice = z.infer<typeof UpdateNoticeSchema>

// ─────────────────────────────────────────────
// Inquiry
// ─────────────────────────────────────────────

export const InquirySchema = z.object({
  id: z.string().cuid(),
  /** null = 비회원 */
  userId: z.string().cuid().nullable().optional(),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(10).max(5000),
  status: InquiryStatusSchema,
  adminReply: z.string().nullable().optional(),
  repliedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Inquiry = z.infer<typeof InquirySchema>

export const CreateInquirySchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  subject: z.string().min(1, '제목을 입력해주세요.').max(200, '제목은 200자 이내로 입력해주세요.'),
  body: z
    .string()
    .min(10, '문의 내용은 최소 10자 이상 입력해주세요.')
    .max(5000, '문의 내용은 5000자 이내로 입력해주세요.'),
})
export type CreateInquiry = z.infer<typeof CreateInquirySchema>

export const AdminReplyInquirySchema = z.object({
  adminReply: z.string().min(1, '답변 내용을 입력해주세요.').max(5000),
  status: InquiryStatusSchema.optional(),
})
export type AdminReplyInquiry = z.infer<typeof AdminReplyInquirySchema>

// ─────────────────────────────────────────────
// Comment
// ─────────────────────────────────────────────

export const CommentSchema = z.object({
  id: z.string().cuid(),
  showcaseId: z.string().cuid(),
  userId: z.string().cuid(),
  body: z.string().min(1).max(1000),
  isDeleted: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Comment = z.infer<typeof CommentSchema>

export const CreateCommentSchema = z.object({
  body: z
    .string()
    .min(1, '댓글 내용을 입력해주세요.')
    .max(1000, '댓글은 1000자 이내로 입력해주세요.'),
})
export type CreateComment = z.infer<typeof CreateCommentSchema>
