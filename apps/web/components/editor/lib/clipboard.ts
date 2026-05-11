'use client'

// ─────────────────────────────────────────────
// clipboard.ts — 복사/붙여넣기/복제 유틸리티
//
// 모듈 레벨 버퍼에 클론 보관.
// Command 패턴으로 undo 가능하도록 AddObjectCommand 사용.
// ─────────────────────────────────────────────

import type { ObjectData, StoryCanvas } from '@storywork/editor-core'
import type { FabricObject } from 'fabric'
import { ActiveSelection } from 'fabric'

import type { HistoryRef as History } from '../types'

// ─── 클립보드 버퍼 ───────────────────────────────────────────────────────────

/** 클론된 fabric 객체 배열 (module-level — 탭 내 공유) */
let _clipboardItems: FabricObject[] = []

// ─── 복사 ─────────────────────────────────────────────────────────────────────

/**
 * 현재 선택 객체를 클립보드에 복사한다.
 * @returns 복사된 객체 수 (0이면 선택 없음)
 */
export async function copySelection(canvas: StoryCanvas): Promise<number> {
  const fc = canvas._fabricCanvas
  const active = fc.getActiveObject()
  if (!active) return 0

  const targets: FabricObject[] = active instanceof ActiveSelection ? active.getObjects() : [active]

  const cloned = await Promise.all(targets.map((obj) => obj.clone()))
  _clipboardItems = cloned
  return cloned.length
}

// ─── 붙여넣기 ─────────────────────────────────────────────────────────────────

type PasteOptions = {
  /** 붙여넣기 오프셋 (px). 기본 20/20 */
  offset?: { x: number; y: number }
}

/**
 * 클립보드 버퍼에서 객체를 붙여넣는다.
 * 각 객체는 AddObjectCommand 로 추가 → undo 가능.
 * @returns 붙여넣어진 객체 수
 */
export async function paste(
  canvas: StoryCanvas,
  history: History,
  opts: PasteOptions = {},
): Promise<number> {
  if (_clipboardItems.length === 0) return 0

  const { offset = { x: 20, y: 20 } } = opts
  const fc = canvas._fabricCanvas
  const { AddObjectCommand } = await import('@storywork/editor-history')

  // 각 클립보드 항목을 다시 clone (paste 는 여러 번 가능)
  const newClones = await Promise.all(_clipboardItems.map((item) => item.clone()))

  fc.discardActiveObject()

  for (const cloned of newClones) {
    cloned.set({
      left: (cloned.left ?? 0) + offset.x,
      top: (cloned.top ?? 0) + offset.y,
    })

    // 기존 data 의 kind 를 유지, id 는 새로 발급
    const existingData = (cloned as FabricObject & { data?: ObjectData }).data
    const kind = existingData?.kind ?? 'prop'

    const cmd = new AddObjectCommand({
      canvas,
      fabricObj: cloned,
      dataOverrides: { kind },
    })
    history.push(cmd)
  }

  fc.requestRenderAll()

  // 다음 paste 는 다시 20px 오프셋 누적을 위해 버퍼 갱신
  _clipboardItems = await Promise.all(_clipboardItems.map((item) => item.clone()))
  _clipboardItems.forEach((item) => {
    item.set({
      left: (item.left ?? 0) + offset.x,
      top: (item.top ?? 0) + offset.y,
    })
  })

  return newClones.length
}

// ─── 복제 ─────────────────────────────────────────────────────────────────────

/**
 * 현재 선택 객체를 즉시 복제한다 (copy + paste 단축).
 * @returns 복제된 객체 수
 */
export async function duplicateSelection(
  canvas: StoryCanvas,
  history: History,
  offset = { x: 16, y: 16 },
): Promise<number> {
  const fc = canvas._fabricCanvas
  const active = fc.getActiveObject()
  if (!active) return 0

  const targets: FabricObject[] = active instanceof ActiveSelection ? active.getObjects() : [active]

  const { AddObjectCommand } = await import('@storywork/editor-history')

  fc.discardActiveObject()

  for (const obj of targets) {
    const cloned = await obj.clone()
    cloned.set({
      left: (obj.left ?? 0) + offset.x,
      top: (obj.top ?? 0) + offset.y,
    })

    const existingData = (obj as FabricObject & { data?: ObjectData }).data
    const kind = existingData?.kind ?? 'prop'

    const cmd = new AddObjectCommand({
      canvas,
      fabricObj: cloned,
      dataOverrides: { kind },
    })
    history.push(cmd)
  }

  fc.requestRenderAll()
  return targets.length
}
