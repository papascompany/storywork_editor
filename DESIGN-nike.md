---

version: alpha
name: Nike
description: |
A photography-first commerce system built on extreme typographic contrast: towering uppercase Futura display lockups over editorial imagery, then dense neutral retail chrome with pill-shaped black CTAs, gray search/tag pills, and tight 8px-grid product cards. For StoryWork, this system is used as an operational admin/editor chrome reference: pure black, pure white, one soft surface gray, hairline borders, pill actions, and a deliberately small set of semantic accents. Chromatic moments are reserved for state, pricing/status signal, or resource category meaning, never decorative chrome.

scope:
marketing-web: DESIGN.md
admin-dashboard: DESIGN-nike.md
editor-chrome: DESIGN-nike.md translated into tool UI tokens, preserving functional canvas/resource colors

colors:
primary: "#111111"
on-primary: "#ffffff"
canvas: "#ffffff"
soft-cloud: "#f5f5f5"
ink: "#111111"
charcoal: "#39393b"
ash: "#4b4b4d"
mute: "#707072"
stone: "#9e9ea0"
hairline: "#cacacb"
hairline-soft: "#e5e5e5"
sale: "#d30005"
sale-deep: "#780700"
success: "#007d48"
success-bright: "#1eaa52"
info: "#1151ff"
info-deep: "#0034e3"
accent-pink: "#ed1aa0"
accent-pink-soft: "#ffb0dd"
accent-purple-soft: "#beaffd"
accent-purple-pale: "#d6d1ff"
accent-teal: "#0a7281"
accent-pink-deep: "#4c012d"

typography:
display-campaign:
fontFamily: Nike Futura ND
fontSize: 96px
fontWeight: 500
lineHeight: 0.9
letterSpacing: 0
textTransform: uppercase
heading-xl:
fontFamily: Helvetica Now Display Medium
fontSize: 32px
fontWeight: 500
lineHeight: 1.2
letterSpacing: 0
heading-lg:
fontFamily: Helvetica Now Display Medium
fontSize: 24px
fontWeight: 500
lineHeight: 1.2
letterSpacing: 0
heading-md:
fontFamily: Helvetica Now Display Medium
fontSize: 16px
fontWeight: 500
lineHeight: 1.75
letterSpacing: 0
body-md:
fontFamily: Helvetica Now Text
fontSize: 16px
fontWeight: 400
lineHeight: 1.5
letterSpacing: 0
body-strong:
fontFamily: Helvetica Now Text Medium
fontSize: 16px
fontWeight: 500
lineHeight: 1.5
letterSpacing: 0
button-lg:
fontFamily: Helvetica Now Display Medium
fontSize: 24px
fontWeight: 500
lineHeight: 1.2
letterSpacing: 0
button-md:
fontFamily: Helvetica Now Text Medium
fontSize: 16px
fontWeight: 500
lineHeight: 1.5
letterSpacing: 0
button-sm:
fontFamily: Helvetica Now Text Medium
fontSize: 14px
fontWeight: 500
lineHeight: 1.5
letterSpacing: 0
link-md:
fontFamily: Helvetica Now Text
fontSize: 16px
fontWeight: 500
lineHeight: 1.75
letterSpacing: 0
textDecoration: underline
caption-md:
fontFamily: Helvetica Now Text Medium
fontSize: 14px
fontWeight: 500
lineHeight: 1.5
letterSpacing: 0
caption-sm:
fontFamily: Helvetica Now Text Medium
fontSize: 12px
fontWeight: 500
lineHeight: 1.5
letterSpacing: 0
utility-xs:
fontFamily: Helvetica Neue
fontSize: 9px
fontWeight: 500
lineHeight: 1.75
letterSpacing: 0

rounded:
none: 0px
sm: 18px
md: 24px
lg: 30px
full: 9999px

spacing:
xxs: 2px
xs: 4px
sm: 8px
md: 12px
lg: 18px
xl: 24px
xxl: 30px
section: 48px

components:
button-primary:
backgroundColor: "{colors.ink}"
textColor: "{colors.on-primary}"
typography: "{typography.button-md}"
rounded: "{rounded.full}"
padding: 16px 32px
height: 48px
button-secondary:
backgroundColor: "{colors.soft-cloud}"
textColor: "{colors.ink}"
typography: "{typography.button-md}"
rounded: "{rounded.full}"
padding: 16px 32px
height: 48px
button-outline:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
typography: "{typography.button-md}"
rounded: "{rounded.full}"
border: "1px solid {colors.ink}"
padding: 12px 24px
button-icon-circular:
backgroundColor: "{colors.soft-cloud}"
textColor: "{colors.ink}"
rounded: "{rounded.full}"
size: 40px
search-pill:
backgroundColor: "{colors.soft-cloud}"
textColor: "{colors.ink}"
typography: "{typography.body-md}"
rounded: "{rounded.md}"
padding: 8px 16px
height: 40px
filter-chip:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
typography: "{typography.button-md}"
rounded: "{rounded.full}"
padding: 8px 16px
filter-chip-active:
backgroundColor: "{colors.ink}"
textColor: "{colors.on-primary}"
typography: "{typography.button-md}"
rounded: "{rounded.full}"
badge-sale-text:
textColor: "{colors.sale}"
typography: "{typography.caption-md}"
product-card:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
typography: "{typography.body-strong}"
rounded: "{rounded.none}"
padding: 0px
utility-bar:
backgroundColor: "{colors.soft-cloud}"
textColor: "{colors.ink}"
typography: "{typography.caption-sm}"
rounded: "{rounded.none}"
height: 36px
primary-nav:
backgroundColor: "{colors.canvas}"
textColor: "{colors.ink}"
typography: "{typography.body-strong}"
rounded: "{rounded.none}"
height: 56px

implementation_contract:

- Admin code should prefer `--nike-*` variables and `.nike-*` utilities.
- `--mkt-*` belongs to marketing surfaces only. Admin code and admin CSS must not define or consume `mkt-*`.
- Do not override shared `--color-brand-*` inside admin globals; editor active tools still depend on shared brand tokens unless explicitly remapped in editor scope.
- Editor uses this system as a neutral chrome translation: panels, borders, buttons, sheets, and command surfaces may adopt ink/canvas/soft-cloud/hairline; resource swatches, canvas object colors, and word effects keep functional color.
- Avoid decorative gradients, color blobs, and one-off hex values in admin/editor chrome.
