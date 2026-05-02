/** @type {import('lint-staged').Config} */
export default {
  '*.{ts,tsx}': ['eslint --fix --max-warnings 0', 'prettier --write'],
  '*.{js,jsx,mjs,cjs}': ['prettier --write'],
  '*.{json,md,yaml,yml,css}': ['prettier --write'],
}
