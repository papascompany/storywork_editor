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
