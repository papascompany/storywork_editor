-- MODE-01 (ADR-0017) — 산출물 모드(웹툰/POD) 스키마
-- additive only. 기존 행은 컬럼 DEFAULT 로 백필된다(Project=pod, Format=mm).
-- px 판형(웹툰)은 widthMm/heightMm 를 픽셀로 해석한다 — 컬럼명은 레거시, 판별자는 unit.

-- CreateEnum
CREATE TYPE "ProjectMode" AS ENUM ('pod', 'webtoon');

-- CreateEnum
CREATE TYPE "FormatUnit" AS ENUM ('mm', 'px');

-- AlterTable — 기존 프로젝트 전부 pod 백필
ALTER TABLE "Project" ADD COLUMN "mode" "ProjectMode" NOT NULL DEFAULT 'pod';

-- AlterTable — 기존 판형 전부 mm 백필
ALTER TABLE "Format" ADD COLUMN "unit" "FormatUnit" NOT NULL DEFAULT 'mm';
