/** @type {import('lint-staged').Config} */
export default {
  '*.{ts,tsx}': ['eslint --fix --max-warnings 0', 'prettier --write'],
  '*.{js,jsx,mjs,cjs}': ['prettier --write'],
  // 포즈 사이드카(data/poses/**)는 기계 생성 산출물 — 포맷 대상에서 제외.
  // 파일명에 괄호가 있으면 prettier 가 glob 문법으로 해석해 실패하는 문제도 회피.
  '*.{json,md,yaml,yml,css}': (files) => {
    const targets = files.filter((f) => !f.includes('data/poses/'))
    if (targets.length === 0) return []
    return [`prettier --write ${targets.map((f) => JSON.stringify(f)).join(' ')}`]
  },
}
