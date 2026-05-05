import type { z } from 'zod'
export declare const SCHEMA_VERSION: 1
export declare const LayerKindSchema: z.ZodEnum<{
  pose: 'pose'
  prop: 'prop'
  decoration: 'decoration'
  text: 'text'
  group: 'group'
  bg: 'bg'
  bubble: 'bubble'
  fx: 'fx'
}>
export type LayerKind = z.infer<typeof LayerKindSchema>
export declare const LayerDataSchema: z.ZodObject<
  {
    resourceId: z.ZodOptional<z.ZodString>
    slotId: z.ZodOptional<z.ZodString>
    locked: z.ZodOptional<z.ZodBoolean>
    visible: z.ZodOptional<z.ZodBoolean>
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>
  },
  z.core.$strip
>
export type LayerData = z.infer<typeof LayerDataSchema>
export type LayerJson = {
  id: string
  kind: LayerKind
  data: LayerData
  fabric: Record<string, unknown>
  children?: LayerJson[]
}
export declare const LayerJsonSchema: z.ZodType<LayerJson>
export declare const PageFormatSchema: z.ZodObject<
  {
    id: z.ZodString
    widthMm: z.ZodNumber
    heightMm: z.ZodNumber
    dpi: z.ZodNumber
  },
  z.core.$strip
>
export type PageFormat = z.infer<typeof PageFormatSchema>
export declare const PageJsonV1Schema: z.ZodObject<
  {
    v: z.ZodLiteral<1>
    format: z.ZodObject<
      {
        id: z.ZodString
        widthMm: z.ZodNumber
        heightMm: z.ZodNumber
        dpi: z.ZodNumber
      },
      z.core.$strip
    >
    layers: z.ZodArray<z.ZodType<LayerJson, unknown, z.core.$ZodTypeInternals<LayerJson, unknown>>>
  },
  z.core.$strip
>
export type PageJsonV1 = z.infer<typeof PageJsonV1Schema>
export declare function emptyPageJson(format: PageFormat): PageJsonV1
export declare function parsePageJson(raw: unknown): PageJsonV1
export declare function migratePageJson(raw: unknown): PageJsonV1
//# sourceMappingURL=v1.d.ts.map
