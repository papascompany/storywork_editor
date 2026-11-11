// ─────────────────────────────────────────────
// zip.ts — 무압축(STORE) ZIP 작성기 (MODE-05)
//
// 이미지 시퀀스를 파일 하나로 내려주기 위한 최소 구현이다. PNG/JPEG 는 이미 압축돼 있어
// DEFLATE 로 얻는 이득이 거의 없으므로 STORE(무압축)만 지원한다 — 그 덕에 외부 의존성 없이
// CRC-32 와 헤더 작성만으로 끝난다. ZIP64 는 지원하지 않는다(4GiB · 65,535개 미만 전제,
// 웹툰 한 화는 수십 MB 수준).
//
// 형식: PKWARE APPNOTE 4.3 — local file header + data … + central directory + EOCD.
// 파일명은 UTF-8 로 쓰고 범용 플래그 bit 11 을 켠다(한글 파일명이 깨지지 않게).
// ─────────────────────────────────────────────

export type ZipEntry = {
  /** ZIP 안의 경로. `/` 로 폴더 구분 */
  name: string
  data: Uint8Array
}

const UTF8_FLAG = 0x0800
const METHOD_STORE = 0
const VERSION = 20 // 2.0 — STORE 와 폴더 경로에 충분

let crcTable: Uint32Array | null = null

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  crcTable = table
  return table
}

/** CRC-32 (IEEE 802.3, ZIP 과 동일한 다항식) */
export function crc32(data: Uint8Array): number {
  const table = getCrcTable()
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = (table[(crc ^ (data[i] as number)) & 0xff] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Date → MS-DOS 날짜/시각(2초 해상도, 1980 이전은 1980-01-01 로 고정) */
function toDosDateTime(date: Date): { time: number; date: number } {
  const year = date.getFullYear()
  if (year < 1980) return { time: 0, date: (1 << 5) | 1 }
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/**
 * 파일 목록을 무압축 ZIP 바이트로 묶는다.
 *
 * @param entries 파일 목록. 이름은 비어 있지 않아야 하고 중복될 수 없다
 * @param modified 모든 항목에 기록할 수정 시각. 기본 현재 시각
 * @throws Error 이름이 비었거나 중복, 또는 ZIP64 가 필요한 크기일 때
 */
export function createStoreZip(entries: readonly ZipEntry[], modified = new Date()): Uint8Array {
  if (entries.length > 0xffff) {
    throw new Error('[editor-export] createStoreZip: 항목이 65,535개를 넘습니다(ZIP64 미지원).')
  }
  const seen = new Set<string>()
  for (const e of entries) {
    if (!e.name) throw new Error('[editor-export] createStoreZip: 빈 파일명은 쓸 수 없습니다.')
    if (seen.has(e.name)) {
      throw new Error(`[editor-export] createStoreZip: 파일명 중복 — ${e.name}`)
    }
    seen.add(e.name)
  }

  const encoder = new TextEncoder()
  const dos = toDosDateTime(modified)
  const prepared = entries.map((e) => ({
    nameBytes: encoder.encode(e.name),
    data: e.data,
    crc: crc32(e.data),
  }))

  const localSize = prepared.reduce((sum, p) => sum + 30 + p.nameBytes.length + p.data.length, 0)
  const centralSize = prepared.reduce((sum, p) => sum + 46 + p.nameBytes.length, 0)
  const total = localSize + centralSize + 22
  if (total > 0xffffffff) {
    throw new Error('[editor-export] createStoreZip: 4GiB 를 넘습니다(ZIP64 미지원).')
  }

  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  let offset = 0
  const localOffsets: number[] = []

  // local file headers + data
  for (const p of prepared) {
    localOffsets.push(offset)
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, VERSION, true)
    view.setUint16(offset + 6, UTF8_FLAG, true)
    view.setUint16(offset + 8, METHOD_STORE, true)
    view.setUint16(offset + 10, dos.time, true)
    view.setUint16(offset + 12, dos.date, true)
    view.setUint32(offset + 14, p.crc, true)
    view.setUint32(offset + 18, p.data.length, true) // compressed = 원본(STORE)
    view.setUint32(offset + 22, p.data.length, true)
    view.setUint16(offset + 26, p.nameBytes.length, true)
    view.setUint16(offset + 28, 0, true) // extra
    out.set(p.nameBytes, offset + 30)
    out.set(p.data, offset + 30 + p.nameBytes.length)
    offset += 30 + p.nameBytes.length + p.data.length
  }

  // central directory
  const centralStart = offset
  prepared.forEach((p, idx) => {
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, VERSION, true) // version made by
    view.setUint16(offset + 6, VERSION, true) // version needed
    view.setUint16(offset + 8, UTF8_FLAG, true)
    view.setUint16(offset + 10, METHOD_STORE, true)
    view.setUint16(offset + 12, dos.time, true)
    view.setUint16(offset + 14, dos.date, true)
    view.setUint32(offset + 16, p.crc, true)
    view.setUint32(offset + 20, p.data.length, true)
    view.setUint32(offset + 24, p.data.length, true)
    view.setUint16(offset + 28, p.nameBytes.length, true)
    view.setUint16(offset + 30, 0, true) // extra
    view.setUint16(offset + 32, 0, true) // comment
    view.setUint16(offset + 34, 0, true) // disk start
    view.setUint16(offset + 36, 0, true) // internal attrs
    view.setUint32(offset + 38, 0, true) // external attrs
    view.setUint32(offset + 42, localOffsets[idx] as number, true)
    out.set(p.nameBytes, offset + 46)
    offset += 46 + p.nameBytes.length
  })

  // end of central directory
  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 4, 0, true)
  view.setUint16(offset + 6, 0, true)
  view.setUint16(offset + 8, prepared.length, true)
  view.setUint16(offset + 10, prepared.length, true)
  view.setUint32(offset + 12, offset - centralStart, true)
  view.setUint32(offset + 16, centralStart, true)
  view.setUint16(offset + 20, 0, true) // comment length

  return out
}
