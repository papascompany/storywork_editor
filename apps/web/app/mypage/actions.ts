'use server'

/**
 * app/mypage/actions.ts
 *
 * 마이페이지 Server Actions.
 * 클라이언트 컴포넌트에서 직접 호출.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser, updateUserProfile } from '@/lib/users'

// ─── updateProfileAction ──────────────────────────────────────────────────────

export type ProfileActionState = {
  ok: boolean
  error?: string
}

/**
 * 프로필 이름 업데이트 Server Action.
 *
 * - 인증 확인 → 미인증이면 로그인 페이지로 redirect
 * - name 유효성 검증은 users.ts 내 updateUserProfile 에서 처리
 * - 성공 시 /mypage 캐시 무효화 (ProfileTab 재렌더)
 */
export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  // 1. 인증 확인
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect('/login?next=/mypage?tab=profile')
  }

  // 2. DB user 조회
  const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  if (!dbUser) {
    return { ok: false, error: '사용자 정보를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.' }
  }

  // 3. form data 추출
  const rawName = formData.get('name')
  if (typeof rawName !== 'string') {
    return { ok: false, error: '이름 값이 올바르지 않습니다.' }
  }

  // 4. 업데이트
  const result = await updateUserProfile(dbUser.id, { name: rawName })
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  // 5. 캐시 무효화 → ProfileTab 재렌더
  revalidatePath('/mypage')

  return { ok: true }
}
