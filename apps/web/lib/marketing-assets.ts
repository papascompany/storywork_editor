/**
 * marketing-assets.ts
 *
 * 마케팅 페이지에서 사용할 큐레이트된 포즈 자산 목록.
 * Supabase Storage public URL 을 직접 구성 (DB 쿼리 없음 — build-time 안전).
 *
 * 슬러그 큐레이션 기준:
 * - Storage 에 200 HTTP 응답 확인된 자산만 포함 (2026-05-10 검증)
 * - 마케팅 목적: thumb.png (256px) 활용 — lowDpi 여도 썸네일 용도엔 충분
 * - 더비맨 4컷: 회사원 일상 → 콘티 작가 시나리오 맞춤
 * - 라이브러리 섹션: 다양한 action × view 커버
 */

const STORAGE_BASE = 'https://wjpyeqckuxyfeytuzgon.supabase.co/storage/v1/object/public/poses'

export type PoseVariant = 'thumb' | 'v1' | 'v2' | 'master'

export type MarketingPose = {
  slug: string
  thumbUrl: string
  fullUrl: string
  alt: string
  hint?: string
}

/**
 * Storage URL 빌더.
 * variant:
 *  - 'thumb'  → thumb.png (256px, PNG)
 *  - 'v1'     → v1.webp  (512px WebP)
 *  - 'v2'     → v2.webp  (1024px WebP)
 *  - 'master' → master.png (원본 PNG)
 */
export function getPoseUrl(slug: string, variant: PoseVariant = 'thumb'): string {
  const file =
    variant === 'thumb'
      ? 'thumb.png'
      : variant === 'v1'
        ? 'v1.webp'
        : variant === 'v2'
          ? 'v2.webp'
          : 'master.png'
  return `${STORAGE_BASE}/${slug}/${file}`
}

function makePose(slug: string, alt: string, hint?: string): MarketingPose {
  return {
    slug,
    thumbUrl: getPoseUrl(slug, 'thumb'),
    fullUrl: getPoseUrl(slug, 'v1'),
    alt,
    hint,
  }
}

/**
 * 더비맨 4컷 콘티용 포즈.
 * 시나리오: 평범한 회사원(더비맨)이 콘티 작가가 되는 여정.
 *
 * 큐레이션 의도:
 * 컷1 — 책상에서 엎드려 졸기 (lying-prone: 10-eohdeurin-1)
 * 컷2 — 책상 작업 자세 (desk-work: 04-chaegsajehanjjogparg-1)
 * 컷3 — 놀람/환호 표정 (surprise: 13-seogi-ggabjjag-1)
 * 컷4 — 자신감 있게 서기 (stand: 01-seogi-01-1)
 *
 * hint 문자열은 기존 테스트 기대값과 일치: '월요일 아침', '점심시간', '퇴근 후 카페', '주말, 책 도착'
 */
export function getDerbymanScenes(): MarketingPose[] {
  return [
    makePose('10-eohdeurin-1', '책상에 엎드려 졸고 있는 회사원', '월요일 아침'),
    makePose('04-chaegsajehanjjogparg-1', '책상에 앉아 작업 중인 모습', '점심시간'),
    makePose('13-seogi-ggabjjag-1', '깜짝 놀란 표정으로 서 있는 모습', '퇴근 후 카페'),
    makePose('01-seogi-01-1', '자신감 있게 서 있는 캐릭터', '주말, 책 도착'),
  ]
}

/**
 * 랜딩 navy 섹션 — 포즈 라이브러리 다양성 쇼케이스 (12개).
 * action × view 매트릭스 기준:
 *  - 서기(stand) 2개
 *  - 앉기(sit) 2개
 *  - 걷기(walk) 2개
 *  - 놀람(surprise) 1개
 *  - 전화(phone) 1개
 *  - 격투(fight) 1개
 *  - 무릎꿇기(kneeling) 1개
 *  - 쓰러짐(fall) 1개
 *  - 팔짱(arms-crossed) 1개
 */
export function getPoseShowcase(): MarketingPose[] {
  return [
    makePose('01-seogi-01-1', '정면으로 서 있는 캐릭터', '서기'),
    makePose('02-seogi-01', '다른 각도로 서 있는 캐릭터', '서기'),
    makePose('01-anjgi-2-1', '의자에 앉아 있는 캐릭터', '앉기'),
    makePose('02-anjaseopargjjaj-1', '팔짱을 끼고 앉은 캐릭터', '앉기 + 팔짱'),
    makePose('walk-01-1', '걷고 있는 캐릭터 (1)', '걷기'),
    makePose('walk-19', '걷고 있는 캐릭터 (2)', '걷기'),
    makePose('13-seogi-ggabjjag-1', '깜짝 놀란 캐릭터', '놀람'),
    makePose('16-seogi-tojhwa-1', '전화 통화 중인 캐릭터', '전화'),
    makePose('fight-ax-doggi-01-1', '도끼를 들고 싸우는 캐릭터', '격투'),
    makePose('07-mureuhggumgoanjgi-1', '무릎을 꿇고 앉은 캐릭터', '무릎꿇기'),
    makePose('16-ggwadaj-1', '쓰러지는 캐릭터', '쓰러짐'),
    makePose('15-seogi-v-1', 'V사인을 하며 서 있는 캐릭터', 'V사인'),
  ]
}

/**
 * /features 페이지용 포즈 (AI 배치 데모 3개 + 검색 결과 미리보기 6개).
 *
 * featureAiDemo: 같은 "책상 작업" 장면에 대해 AI가 추천하는 포즈 3개 후보.
 * featureSearchDemo: "놀란 표정" 검색 시 나오는 결과 포즈 6개.
 */
export function getFeatureShowcase(): {
  aiDemo: MarketingPose[]
  searchDemo: MarketingPose[]
} {
  return {
    aiDemo: [
      makePose('04-chaegsajehanjjogparg-1', '한 쪽 팔을 괴고 책상 작업하는 모습', '추천 1 (92%)'),
      makePose('04-chaegsajehanjjogparg-2', '책상 작업 중 다른 자세', '추천 2 (78%)'),
      makePose('04-chaegsajehanjjogparg-3', '책상 작업 세 번째 포즈', '추천 3 (61%)'),
    ],
    searchDemo: [
      makePose('13-seogi-ggabjjag-1', '깜짝 놀란 서있는 모습 1', '놀람'),
      makePose('13-seogi-ggabjjag-2', '깜짝 놀란 서있는 모습 2', '놀람'),
      makePose('13-seogi-ggabjjag-3', '깜짝 놀란 서있는 모습 3', '놀람'),
      makePose('norgragi-01-1', '놀라는 표정의 캐릭터', '놀람'),
      makePose('11-seogi-songarag-01', '손가락으로 가리키는 모습', '지목'),
      makePose('11-seogi-songarag-02', '손가락으로 가리키는 두 번째 포즈', '지목'),
    ],
  }
}
