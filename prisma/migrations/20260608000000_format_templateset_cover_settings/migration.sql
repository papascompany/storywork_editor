-- 표지(Cover) 설정 — Format 기본값 + TemplateSet 오버라이드 (admin 1차)
-- 모두 additive(컬럼 추가). 기존 데이터 무손실 · 기본값으로 backward-compatible.
-- 편집기 실제 소비(표지 페이지 생성/렌더, FormatPicker isActive 필터)는 phase 2.

-- ── Format: 표지 기본 정책 + 활성화 ────────────────────────────────
ALTER TABLE "Format"
  ADD COLUMN "coverEnabled"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "coverWidthMm"  DOUBLE PRECISION,
  ADD COLUMN "coverHeightMm" DOUBLE PRECISION,
  ADD COLUMN "isActive"      BOOLEAN NOT NULL DEFAULT true;

-- ── TemplateSet: 표지 오버라이드(상속 = NULL) + 활성화 ──────────────
ALTER TABLE "TemplateSet"
  ADD COLUMN "coverEnabled"  BOOLEAN,
  ADD COLUMN "coverWidthMm"  DOUBLE PRECISION,
  ADD COLUMN "coverHeightMm" DOUBLE PRECISION,
  ADD COLUMN "isActive"      BOOLEAN NOT NULL DEFAULT true;
