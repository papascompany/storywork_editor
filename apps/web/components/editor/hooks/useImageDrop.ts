'use client'

// ─────────────────────────────────────────────
// useImageDrop — 이미지 파일 드래그앤드롭 훅
//
// 캔버스 영역 전체에 onDragOver/onDragEnter/onDragLeave/onDrop 핸들러를 제공.
// 드래그 활성 시: isDragging = true → 호출자가 시각 안내 렌더.
// 이미지 파일 드롭 시: FileReader → dataURL → fabric Image → addObject.
// 제한: 데스크톱 10MB / 모바일 4MB (Storige BUG-006 기준)
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { AddObjectCommand } from '@storywork/editor-history'
import { showToast } from '@storywork/ui'
import { FabricImage } from 'fabric'
import { useCallback, useRef, useState } from 'react'

import type { HistoryRef as History } from '../types'

const ACCEPTED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_SIZE_DESKTOP = 10 * 1024 * 1024 // 10MB
const MAX_SIZE_MOBILE = 4 * 1024 * 1024 // 4MB (BUG-006)

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

function getMaxSize(): number {
  return isCoarsePointer() ? MAX_SIZE_MOBILE : MAX_SIZE_DESKTOP
}

async function loadImageFromDataUrl(dataUrl: string): Promise<FabricImage> {
  return FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
}

type UseImageDropOptions = {
  canvas: StoryCanvas | null
  history: History | null
}

export type UseImageDropResult = {
  isDragging: boolean
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function useImageDrop({ canvas, history }: UseImageDropOptions): UseImageDropResult {
  const [isDragging, setIsDragging] = useState(false)
  // 드래그 카운터: dragenter/dragleave 는 자식 요소 진입/이탈마다 발생하므로 카운터로 관리
  const dragCounterRef = useRef(0)

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 파일 드롭 허용 표시
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragging(false)

      if (!canvas || !history) return

      const files = Array.from(e.dataTransfer.files)
      const maxSize = getMaxSize()
      let addedCount = 0

      for (const file of files) {
        // MIME 타입 검증
        if (!ACCEPTED_MIME.has(file.type)) {
          showToast(`"${file.name}" 은 지원하지 않는 파일 형식입니다.`, 'warning')
          continue
        }

        // 크기 검증
        if (file.size > maxSize) {
          const limitMb = maxSize / 1024 / 1024
          showToast(`"${file.name}" 은 ${limitMb}MB 제한을 초과합니다.`, 'warning')
          continue
        }

        // 파일 읽기 + 캔버스 추가
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result
          if (typeof dataUrl !== 'string') return

          try {
            const img = await loadImageFromDataUrl(dataUrl)

            // 캔버스 중앙에 배치 (최대 너비/높이 60% 제한)
            const canvasWidth = canvas._fabricCanvas.getWidth()
            const canvasHeight = canvas._fabricCanvas.getHeight()
            const maxW = canvasWidth * 0.6
            const maxH = canvasHeight * 0.6
            const naturalW = img.width ?? 1
            const naturalH = img.height ?? 1
            const scale = Math.min(1, maxW / naturalW, maxH / naturalH)

            img.set({
              left: (canvasWidth - naturalW * scale) / 2,
              top: (canvasHeight - naturalH * scale) / 2,
              scaleX: scale,
              scaleY: scale,
            })

            // ObjectKind 에 'image' 없음 → 사용자 업로드는 'prop' 으로 분류 (M7 에서 upload 종류 추가 예정)
            const cmd = new AddObjectCommand({
              canvas,
              fabricObj: img,
              dataOverrides: { kind: 'prop' },
            })
            history.push(cmd)

            // 추가 후 선택
            const addedId = cmd.assignedId
            if (addedId) {
              const fabricObj = canvas.getObject(addedId)
              if (fabricObj) {
                canvas._fabricCanvas.setActiveObject(fabricObj)
                canvas._fabricCanvas.requestRenderAll()
              }
            }

            addedCount++
            if (
              files.length === 1 ||
              addedCount ===
                files.filter((f) => ACCEPTED_MIME.has(f.type) && f.size <= maxSize).length
            ) {
              showToast(
                addedCount === 1 ? '이미지 추가됨' : `이미지 ${addedCount}개 추가됨`,
                'success',
              )
            }
          } catch (err) {
            console.error('[useImageDrop] 이미지 로드 실패:', err)
            showToast(`"${file.name}" 을 불러오는 데 실패했습니다.`, 'error')
          }
        }
        reader.readAsDataURL(file)
      }
    },
    [canvas, history],
  )

  return { isDragging, onDragEnter, onDragLeave, onDragOver, onDrop }
}
