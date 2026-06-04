/**
 * @storywork/pdf-engine — 공개 API
 *
 * buildPdf()  : 메인 빌더
 * types       : 입출력 타입
 */
export type {
  PdfBuildInput,
  PdfBuildResult,
  PdfBuildOptions,
  PdfFormat,
  CoverInput,
  CoverTone,
  PageInput,
} from './types.js'

export { MM_TO_PT, PDF_PRODUCER } from './types.js'

export { fabricLayersToCommands } from './adapter/fabric-to-pdf.js'
export type { RenderCommand, AdapterResult } from './adapter/fabric-to-pdf.js'

export { buildPdf } from './build.js'

// ─── Preflight ───────────────────────────────────────────────────────────────

export { preflight, preflightBuffer } from './preflight/check.js'
export type { PreflightReport, PreflightViolation, PreflightSeverity } from './preflight/types.js'
export type { PreflightProfile, ProfileLoader } from './preflight/profiles.js'
export {
  PROFILES,
  getProfileById,
  setProfileLoader,
  getProfileLoader,
} from './preflight/profiles.js'
export { buildPreflightPdf } from './preflight/visualize.js'
