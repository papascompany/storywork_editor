#!/usr/bin/env python3
"""Pretendard Variable 을 KS X 1001 한글 2,350자 + 라틴·기호로 서브셋한다 (PERF-ADMIN-04).

원본(2.0MB)은 apps/web/public/fonts/PretendardVariable.woff2 에 그대로 둔다.
admin 은 이 스크립트 결과(약 0.5MB)를 쓴다 — 가변 굵기 축(wght)은 유지된다.
KS X 1001 밖의 한글 음절(예: 똠·햏·뷁)은 글자 단위로 fallback 폰트로 그려진다.

사용:
  pip install fonttools brotli
  python3 scripts/subset-pretendard.py \
    apps/web/public/fonts/PretendardVariable.woff2 \
    apps/admin/public/fonts/PretendardVariable.subset.woff2
"""

import sys

from fontTools import subset

# 라틴·문장부호·통화·화살표·도형·원문자·CJK 기호·한글 호환 자모·전각
EXTRA_RANGES = [
    (0x0020, 0x007E), (0x00A0, 0x00FF), (0x0131, 0x0131), (0x0152, 0x0153),
    (0x02C6, 0x02C6), (0x02DA, 0x02DA), (0x02DC, 0x02DC), (0x2000, 0x206F),
    (0x20A9, 0x20A9), (0x20AC, 0x20AC), (0x2100, 0x215F), (0x2190, 0x21FF),
    (0x2200, 0x22FF), (0x2460, 0x24FF), (0x25A0, 0x25FF), (0x2600, 0x26FF),
    (0x3000, 0x303F), (0x3131, 0x318E), (0x3200, 0x32FF), (0xFF01, 0xFF5E),
    (0xFFE0, 0xFFE6),
]


def ksx1001_hangul() -> list[int]:
    # euc-kr 코덱은 KS X 1001 밖 음절도 8바이트 조합형으로 인코딩하므로 2바이트만 고른다
    return [cp for cp in range(0xAC00, 0xD7A4) if len(chr(cp).encode('euc-kr')) == 2]


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dst = sys.argv[1], sys.argv[2]
    unicodes = ksx1001_hangul()
    for lo, hi in EXTRA_RANGES:
        unicodes.extend(range(lo, hi + 1))

    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    font = subset.load_font(src, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    subset.save_font(font, dst, options)
    print(f'{dst}: 한글 {len(ksx1001_hangul())}자 + 기호 {len(unicodes) - len(ksx1001_hangul())}개')


if __name__ == '__main__':
    main()
