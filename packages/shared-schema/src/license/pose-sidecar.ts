import { z } from 'zod'

import { KPSchema } from '../zod/resource.js'

// ─────────────────────────────────────────────
// PoseSidecar — data/poses/raw/<id>.kp.json 검증 스키마
// erd.md §4-bis 기준
// ─────────────────────────────────────────────

const SidecarLicenseSchema = z.object({
  id: z.string().min(1),
  holder: z.string().min(1),
  terms: z.string().min(1),
})
export type SidecarLicense = z.infer<typeof SidecarLicenseSchema>

const normalizedCoord = z.number().min(0).max(1)

const BBoxSchema = z.object({
  x: normalizedCoord,
  y: normalizedCoord,
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
})

export const PoseSidecarSchema = z
  .object({
    v: z.literal(1),
    format: z.enum(['png', 'svg']),
    size: z.object({
      /// 마스터 픽셀 너비 (SVG 의 경우 viewBox 너비)
      w: z.number().positive(),
      /// 마스터 픽셀 높이 (SVG 의 경우 viewBox 높이)
      h: z.number().positive(),
    }),
    keypoints: z.array(KPSchema).min(1),
    bbox: BBoxSchema,
    flippable: z.boolean(),
    /// 누락 시 적재 거부 (CLAUDE.md §9 위험 목록)
    license: SidecarLicenseSchema,
  })
  .superRefine((data, ctx) => {
    // 키포인트 개수 비즈니스 규칙: 최소 3개 권장 (head/mouth/center)
    // inferred 키포인트로 채워진 경우도 허용하되 경고
    const hasHead = data.keypoints.some((kp) => kp.name === 'head')
    const hasMouth = data.keypoints.some((kp) => kp.name === 'mouth')
    const hasCenter = data.keypoints.some((kp) => kp.name === 'center')

    if (!hasHead || !hasMouth || !hasCenter) {
      // 경고 수준 — 에러가 아닌 custom issue (검수 큐로 이동)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['keypoints'],
        message:
          '권장 키포인트(head, mouth, center) 중 일부가 누락됩니다. 인입 시 자동 추정값이 적용됩니다.',
        fatal: false,
      })
    }
  })
export type PoseSidecar = z.infer<typeof PoseSidecarSchema>

/// 사이드카 파일 내용을 파싱
export function parsePoseSidecar(raw: unknown): PoseSidecar {
  return PoseSidecarSchema.parse(raw)
}
