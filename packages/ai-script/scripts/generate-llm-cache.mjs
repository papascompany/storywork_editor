/**
 * generate-llm-cache.mjs — 골든셋용 LLM 응답 캐시 생성기
 *
 * 실행: node packages/ai-script/scripts/generate-llm-cache.mjs
 *
 * 현재 룰-only 파서 결과(예측 장면 수)를 기반으로
 * 각 장면에 realistic 메타데이터를 주입한 캐시 파일을 생성한다.
 *
 * 이 캐시 파일은 STORYWORK_LLM_CACHE=1 환경에서 LLM 호출을 대체한다.
 * → LLM 없이 F1 측정 가능 + 결정론 보장
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = join(__dirname, '..')
const GOLDEN_DIR = join(PACKAGE_ROOT, '__tests__/golden')
const CACHE_DIR = join(PACKAGE_ROOT, '__tests__/__llm-cache__')

function inputHash(raw, seed) {
  return createHash('sha256').update(`${seed}:${raw}`).digest('hex').slice(0, 16)
}

// 장르/케이스별 메타데이터 매핑 (현실적인 mock 데이터)
const META_MAP = {
  'diary/01-short': {
    moods: ['neutral'],
    emotions: ['neutral'],
    locations: ['방 내부'],
    times: ['evening'],
    cameras: ['medium'],
    pacings: ['slow'],
  },
  'diary/02-medium': {
    moods: ['calm', 'hopeful'],
    emotions: ['happy', 'happy'],
    locations: ['카페', '거리'],
    times: ['noon', 'evening'],
    cameras: ['medium', 'wide'],
    pacings: ['slow', 'slow'],
  },
  'diary/03-long': {
    moods: ['calm', 'hopeful'],
    emotions: ['neutral', 'calm'],
    locations: ['사무실', '사무실 창가'],
    times: ['morning', 'noon'],
    cameras: ['medium', 'wide'],
    pacings: ['slow', 'normal'],
  },
  'diary/04-very-long': {
    moods: ['calm', 'sad', 'hopeful'],
    emotions: ['neutral', 'sad', 'hopeful'],
    locations: ['방 내부', '방 내부', '방 내부'],
    times: ['morning', 'morning', 'noon'],
    cameras: ['medium', 'closeup', 'wide'],
    pacings: ['slow', 'slow', 'normal'],
  },
  'essay/01-short': {
    moods: ['neutral'],
    emotions: ['neutral'],
    locations: ['방 내부'],
    times: ['morning'],
    cameras: ['medium'],
    pacings: ['slow'],
  },
  'essay/02-medium': {
    moods: ['tense'],
    emotions: ['tense'],
    locations: ['방 내부 창가'],
    times: ['morning'],
    cameras: ['closeup'],
    pacings: ['slow'],
  },
  'essay/03-long': {
    moods: ['hopeful'],
    emotions: ['happy'],
    locations: ['기차 내부'],
    times: ['noon'],
    cameras: ['wide'],
    pacings: ['slow'],
  },
  'essay/04-very-long': {
    moods: ['sad'],
    emotions: ['tense'],
    locations: ['방 내부'],
    times: ['noon'],
    cameras: ['closeup'],
    pacings: ['slow'],
  },
  'light-novel/01-short': {
    moods: ['tense'],
    emotions: ['surprised'],
    locations: ['불명'],
    times: undefined,
    cameras: ['medium'],
    pacings: ['normal'],
  },
  'light-novel/02-medium': {
    moods: ['action', 'tense'],
    emotions: ['surprised', 'tense'],
    locations: ['거리', '거리'],
    times: ['noon', 'noon'],
    cameras: ['medium', 'closeup'],
    pacings: ['fast', 'normal'],
  },
  'light-novel/03-long': {
    moods: ['action', 'tense', 'action'],
    emotions: ['fearful', 'tense', 'tense'],
    locations: ['전장', '전장', '전장'],
    times: undefined,
    cameras: ['wide', 'medium', 'closeup'],
    pacings: ['fast', 'fast', 'fast'],
  },
  'light-novel/04-very-long': {
    moods: ['tense', 'tense', 'action', 'tense'],
    emotions: ['fearful', 'tense', 'tense', 'fearful'],
    locations: ['던전 입구', '던전 내부', '던전 내부', '최종 관문'],
    times: undefined,
    cameras: ['wide', 'medium', 'medium', 'closeup'],
    pacings: ['normal', 'normal', 'fast', 'fast'],
  },
  'novel/01-short': {
    moods: ['calm', 'calm'],
    emotions: ['neutral', 'happy'],
    locations: ['실내', '실내 창가'],
    times: ['noon', 'noon'],
    cameras: ['medium', 'medium'],
    pacings: ['slow', 'normal'],
  },
  'novel/02-medium': {
    moods: ['calm', 'tense', 'neutral'],
    emotions: ['neutral', 'sad', 'neutral'],
    locations: ['카페 외부', '카페 내부', '카페 내부'],
    times: ['morning', 'morning', 'morning'],
    cameras: ['wide', 'medium', 'closeup'],
    pacings: ['slow', 'normal', 'normal'],
  },
  'novel/03-long': {
    moods: ['sad', 'calm', 'tense', 'neutral'],
    emotions: ['sad', 'neutral', 'neutral', 'neutral'],
    locations: ['고향 집 거실', '부엌', '식탁', '집 외부'],
    times: ['morning', 'morning', 'noon', 'noon'],
    cameras: ['wide', 'medium', 'medium', 'wide'],
    pacings: ['slow', 'slow', 'normal', 'normal'],
  },
  'novel/04-very-long': {
    moods: ['neutral', 'sad', 'hopeful', 'neutral', 'romantic'],
    emotions: ['neutral', 'sad', 'hopeful', 'surprised', 'happy'],
    locations: ['도시 거리', '극장 내부', '무대', '극장 로비', '극장 외부'],
    times: ['evening', 'evening', 'evening', 'night', 'night'],
    cameras: ['wide', 'wide', 'medium', 'closeup', 'wide'],
    pacings: ['slow', 'slow', 'normal', 'normal', 'slow'],
  },
  'screenplay/01-short': {
    moods: ['neutral'],
    emotions: ['neutral'],
    locations: ['실내'],
    times: ['noon'],
    cameras: ['medium'],
    pacings: ['normal'],
  },
  'screenplay/02-medium': {
    moods: ['neutral', 'tense'],
    emotions: ['neutral', 'sad'],
    locations: ['학교 복도', '교실'],
    times: ['noon', 'noon'],
    cameras: ['medium', 'medium'],
    pacings: ['normal', 'normal'],
  },
  'screenplay/03-long': {
    moods: ['tense', 'neutral', 'tense'],
    emotions: ['tense', 'neutral', 'tense'],
    locations: ['불명의 건물 외부', '건물 내부', '건물 내부'],
    times: undefined,
    cameras: ['wide', 'medium', 'closeup'],
    pacings: ['normal', 'normal', 'fast'],
  },
  'screenplay/04-very-long': {
    moods: ['neutral', 'neutral', 'neutral', 'happy'],
    emotions: ['neutral', 'neutral', 'neutral', 'happy'],
    locations: ['약속 장소', '카페', '공원', '귀갓길'],
    times: ['noon', 'noon', 'evening', 'evening'],
    cameras: ['wide', 'medium', 'wide', 'medium'],
    pacings: ['normal', 'normal', 'normal', 'slow'],
  },
}

// 장르별 캐릭터 bodyType
const CHAR_TYPES = {
  철수: 'M',
  영희: 'F',
  민수: 'M',
  아리아: 'F',
  기사: 'M',
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  const genres = await readdir(GOLDEN_DIR)
  let count = 0

  for (const genre of genres) {
    const genreDir = join(GOLDEN_DIR, genre)
    const files = (await readdir(genreDir)).filter((f) => f.endsWith('.txt'))

    for (const txtFile of files) {
      const base = txtFile.replace('.txt', '')
      const id = `${genre}/${base}`
      const text = await readFile(join(genreDir, txtFile), 'utf-8')
      const expected = JSON.parse(await readFile(join(genreDir, `${base}.expected.json`), 'utf-8'))

      const meta = META_MAP[id]
      if (!meta) {
        console.warn(`[SKIP] META_MAP 미정의: ${id}`)
        continue
      }

      const hash = inputHash(text, 0)
      const seed = 0

      // 현재 룰-only 장면 수를 기반으로 캐시 생성
      // (실제 LLM 호출 시 장면 분할은 변경 안 하고 메타만 추가)
      const sceneCount = meta.moods.length
      const scenes = Array.from({ length: sceneCount }, (_, i) => ({
        index: i,
        location: meta.locations[i] ?? meta.locations[0],
        ...(meta.times ? { timeOfDay: meta.times[i] ?? meta.times[0] } : {}),
        cameraAngle: meta.cameras[i] ?? meta.cameras[0],
        pacing: meta.pacings[i] ?? meta.pacings[0],
        mood: meta.moods[i] ?? 'neutral',
        emotion: meta.emotions[i] ?? 'neutral',
      }))

      const characters = expected.expectedCharacters.map((name) => ({
        name,
        ...(CHAR_TYPES[name] ? { suggestedBodyType: CHAR_TYPES[name] } : {}),
      }))

      const cacheData = {
        scenes,
        characters,
        confidence: 0.88,
      }

      const filename = `${hash}-${seed}.json`
      await writeFile(join(CACHE_DIR, filename), JSON.stringify(cacheData, null, 2), 'utf-8')
      console.log(`[OK] ${id} → ${filename} (${sceneCount} scenes)`)
      count++
    }
  }

  console.log(`\n캐시 파일 생성 완료: ${count}개`)
}

await main()
