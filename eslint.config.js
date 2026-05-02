// @ts-check
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'

/**
 * 패키지 역참조 금지 룰 (CLAUDE.md §3.1 + docs/modules/index.md 의존성 매트릭스)
 *
 * 허용된 방향(단방향):
 *   apps/* → packages/*
 *   packages/* → packages/shared-*
 *
 * 금지 패턴:
 *   packages/* → apps/*                          (역참조)
 *   packages/shared-* → packages/editor-*        (상위 계층 참조)
 *   packages/shared-* → packages/ai-*            (상위 계층 참조)
 *   packages/editor-core → packages/editor-layers 등 동급 패키지 (매트릭스 외 참조)
 */

const PACKAGES_ROOT = './packages'

/**
 * 의존성 매트릭스 기반 금지 경로 생성
 * from: 소스 패키지 경로 패턴
 * disallow: 참조 금지 대상 경로 패턴들
 */
const restrictedPaths = [
  // shared-* 패키지는 editor-*, ai-*, pdf-engine, apps-* 참조 금지
  {
    target: [
      `${PACKAGES_ROOT}/shared-schema/**`,
      `${PACKAGES_ROOT}/shared-ui/**`,
      `${PACKAGES_ROOT}/shared-utils/**`,
    ],
    from: [
      `${PACKAGES_ROOT}/editor-core/**`,
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'shared-* 패키지는 상위 계층 패키지를 참조할 수 없습니다 (단방향 의존성).',
  },

  // editor-core: 다른 editor-* 참조 금지 (schema/utils만 허용)
  {
    target: [`${PACKAGES_ROOT}/editor-core/**`],
    from: [
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-core는 다른 editor-* 패키지를 참조할 수 없습니다.',
  },

  // editor-layers: editor-core만 허용 (다른 editor-* 금지)
  {
    target: [`${PACKAGES_ROOT}/editor-layers/**`],
    from: [
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-layers는 editor-history/template/pose 등을 참조할 수 없습니다.',
  },

  // editor-history: editor-core만 허용
  {
    target: [`${PACKAGES_ROOT}/editor-history/**`],
    from: [
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-history는 editor-core와 shared-* 만 참조할 수 있습니다.',
  },

  // editor-template: editor-core, editor-layers, editor-history만 허용
  {
    target: [`${PACKAGES_ROOT}/editor-template/**`],
    from: [
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-template은 editor-core/layers/history와 shared-* 만 참조할 수 있습니다.',
  },

  // editor-pose/text/effects: editor-core만 허용
  {
    target: [
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
    ],
    from: [
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-pose/text/effects는 editor-core와 shared-* 만 참조할 수 있습니다.',
  },

  // editor-export: editor-core, editor-layers만 허용
  {
    target: [`${PACKAGES_ROOT}/editor-export/**`],
    from: [
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-export는 editor-core/layers와 shared-* 만 참조할 수 있습니다.',
  },

  // editor-ui: 모든 editor-* 허용, ai-*/pdf-engine 금지
  {
    target: [`${PACKAGES_ROOT}/editor-ui/**`],
    from: [
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'editor-ui는 ai-* 또는 pdf-engine 을 직접 참조할 수 없습니다.',
  },

  // ai-* 패키지: 서로 교차 참조 금지 (schema/utils만 허용)
  {
    target: [`${PACKAGES_ROOT}/ai-script/**`],
    from: [
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/editor-core/**`,
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'ai-script는 schema/utils 만 참조할 수 있습니다.',
  },
  {
    target: [`${PACKAGES_ROOT}/ai-recommend/**`],
    from: [
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-layout/**`,
      `${PACKAGES_ROOT}/editor-core/**`,
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'ai-recommend는 schema/utils 만 참조할 수 있습니다.',
  },
  {
    target: [`${PACKAGES_ROOT}/ai-layout/**`],
    from: [
      `${PACKAGES_ROOT}/ai-script/**`,
      `${PACKAGES_ROOT}/ai-recommend/**`,
      `${PACKAGES_ROOT}/editor-layers/**`,
      `${PACKAGES_ROOT}/editor-history/**`,
      `${PACKAGES_ROOT}/editor-template/**`,
      `${PACKAGES_ROOT}/editor-pose/**`,
      `${PACKAGES_ROOT}/editor-text/**`,
      `${PACKAGES_ROOT}/editor-effects/**`,
      `${PACKAGES_ROOT}/editor-export/**`,
      `${PACKAGES_ROOT}/editor-ui/**`,
      `${PACKAGES_ROOT}/pdf-engine/**`,
      './apps/**',
    ],
    message: 'ai-layout는 editor-core(헤드리스)와 schema/utils 만 참조할 수 있습니다.',
  },

  // 모든 packages/* → apps/* 역참조 금지
  {
    target: [`${PACKAGES_ROOT}/**`],
    from: ['./apps/**'],
    message: '패키지는 apps를 역참조할 수 없습니다 (단방향 의존성).',
  },
]

/** @type {import("eslint").Linter.Config[]} */
export default [
  // 전역 무시
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/.turbo/**',
      '**/*.tsbuildinfo',
      '**/coverage/**',
      '**/storybook-static/**',
      '**/playwright-report/**',
    ],
  },

  // JS 기본 권장
  js.configs.recommended,

  // TypeScript 파일 공통 설정
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      // TypeScript가 타입 체크를 담당하므로 기본 JS 룰 비활성화 (TS 전용 룰로 대체)
      'no-undef': 'off',
      'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars 로 대체

      // TypeScript strict 규칙
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // import 정렬
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // 패키지 역참조 금지 (의존성 매트릭스 강제)
      // basePath 를 명시해 glob 경로 기준을 모노레포 루트로 고정
      'import/no-restricted-paths': [
        'error',
        { zones: restrictedPaths, basePath: import.meta.dirname },
      ],

      // 일반 규칙
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // 테스트 파일 — 일부 규칙 완화
  {
    files: [
      '**/__tests__/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.tsx',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // 설정 파일 (JS) — CommonJS 모듈 허용
  {
    files: ['*.config.js', '*.config.ts', '**/.prettierrc.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
