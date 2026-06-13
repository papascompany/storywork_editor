/**
 * apps/web/lib/display-name.ts
 *
 * 공개 표시명 유틸 (PII 보호).
 *
 * 쇼케이스·공모전·댓글·공지 등 비로그인 포함 누구에게나 보이는 표면에서
 * 사용자가 표시 이름(name)을 설정하지 않았을 때 전체 이메일을 그대로 노출하면 안 된다.
 * (BOARD-05 출품 플로우 도입으로 Showcase contest 행이 처음 생성 가능해지며
 *  공개 렌더 경로가 실제 도달 가능해진 것을 계기로 전수 마스킹)
 *
 * 규칙:
 *  - name 이 있으면 그대로 사용
 *  - 없으면 이메일 로컬파트 앞 2글자만 노출 + 마스킹 (예: "ab***")
 *  - 이메일도 없으면 '익명'
 *
 * ⚠️ 호출부는 raw email 을 클라이언트로 보내지 말고, 이 함수의 반환값(마스킹된 문자열)만
 * 렌더/응답에 사용한다.
 */
export function publicDisplayName(name: string | null | undefined, email?: string | null): string {
  if (name && name.trim().length > 0) return name.trim()
  const local = (email ?? '').split('@')[0] ?? ''
  if (local.length === 0) return '익명'
  if (local.length <= 2) return `${local}***`
  return `${local.slice(0, 2)}***`
}
