# Alignment, spacing and type report

This is a visual-only pass. No utilities, services, hooks, tests or Supabase files were changed. SHA-256 hashes of those directories were compared before and after the pass and matched.

## Measurement convention

Positions below are CSS layout coordinates, not live browser measurements or the visible ink bounds of a font. `x` is the title line box's left edge; `y` is its top. They exclude browser chrome, the phone status bar and any native PWA framing.

Reference desktop: 1440px viewport, 16px root font, 256px sidebar, viewport scrolled to the top. Reference phone: 390px viewport, hidden sidebar. Before values are calculated from the previous CSS. Content-dependent values are explicitly labelled rather than presented as measured pixels.

## Desktop before and after

| Page | Before title x / y | After title x / y |
| --- | --- | --- |
| Today | 320px / 108px: greeting followed a separate Today/streak row | 352px / 48px: greeting is the page title |
| Journal list | 368px / 40px | 352px / 48px |
| Unsent Letters list | 368px / 40px | 352px / 48px |
| Journal/letter editor | 512px / 40px | 352px / 48px |
| My Story, reading and editing | 520px / 40px | 352px / 48px |
| No contact | 558px / 40px: an icon and 12px gap displaced the title from the 520px content edge | 352px / 48px: no title icon |
| Sign out | 368px / 40px | 352px / 48px |
| Onboarding, returning user with sidebar | 584px / content-dependent; title was inside a padded, vertically centred card after the logo and eyebrow | 352px / 48px; header is outside the card |
| Initial onboarding, sidebar absent | 456px / content-dependent for the same reason | 224px / 48px |

The old onboarding title was approximately 139.5px below the card's top on desktop. The card itself could move vertically according to its content and viewport height, so no fixed viewport y-position is claimed.

### Desktop container calculation

Available app region: `1440 - 256 = 1184px`.

Shared outer frame: `62rem + 2 × 32px = 1056px`.

Title left edge: `256 + (1184 - 1056) / 2 + 32 = 352px`.

Both content widths begin there:

- Wide content: at most 62rem / 992px (Today and journal/letter lists).
- Narrow content: at most 40rem / 640px (editor, My Story, No contact, Sign out, Onboarding).

The narrow container has no independent centring margin. Initial onboarding uses the same frame without the sidebar, giving `224px` at this reference viewport. The existing incomplete-onboarding sidebar condition is unchanged.

## Phone before and after

| Page | Before title x / y | After title x / y |
| --- | --- | --- |
| Today | 20px / approximately 140px when the old Today/streak row wrapped | 16px / 48px |
| Journal list | 20px / 40px | 16px / 48px |
| Unsent Letters list | 20px / 40px | 16px / 48px |
| Journal/letter editor | 20px / 40px | 16px / 48px |
| My Story | 24px / 40px | 16px / 48px |
| No contact | 62px / 40px including the title icon offset | 16px / 48px |
| Sign out | 20px / 40px | 16px / 48px |
| Onboarding | 48px / content-dependent inside the old card | 16px / 48px |

The old phone onboarding title was approximately 123.5px below the card's top. The new title starts at 48px regardless of form height. Streak chips and other header actions can wrap below the title without moving its top edge.

## Typography and spacing

- `--font-heading`: Newsreader, normal 400. Imported separately in normal and italic styles.
- `--font-body`: DM Sans, 400 / 500 / 600.
- All h1/h2/h3 headings, encouragement quotes, journal title inputs and saved My Story answers use Newsreader 400.
- Body text is 16px; small text and labels are at least 14px.
- Page titles use `clamp(1.75rem, 3vw, 2.25rem)` with a 1.2 line height.
- Fontsource font files use `font-display: swap`.
- The spacing tokens are 8 / 16 / 24 / 32 / 48px. Page top padding is 48px. Page side padding is 32px on desktop, 16px at 800px and below.
- Sections have 48px separation, card grids 24px gaps, and related controls 16px gaps.
- Radius, border width, focus outline and control dimensions are separate from the spacing scale.

## Specific layout changes

- Shared PageHeader and PageShell are used by every requested signed-in page, including both journal list modes and the editor.
- Today has no extra Today heading. Its existing greeting is the title; the chips read Check-in streak / No contact with their existing counts. The app-visit calculation is unchanged.
- Goals form a chip row below the scenic hero. Writing tiles align to the top; descriptions reserve at least two lines of equal space.
- The type-of-writing select is beside the journal title, followed immediately by the writing area. Field handlers are unchanged.
- No contact has a short introduction and a native How this works disclosure. Weekly circles are 40px. A very narrow weekly strip scrolls within itself instead of making the whole page overflow.
- Onboarding has no duplicate logo or extra check icon. Its original native checkboxes remain.
- The Welcome headline is Newsreader 400; you. uses the actual italic font face.

## Verification

- npm test: 74 passed.
- npm run build: passed. The existing JavaScript bundle-size advisory remains.
- Targeted lint: no errors; existing effect/state warnings remain.
- Protected-directory hash comparison: unchanged.
- Static checks: all CSS variables resolve; all seven page components use PageHeader and PageShell; requested font files use swap; spacing tokens use only the five specified values.

## Browser verification still needed

No development server was started and no browser pixel measurements are claimed. On your running local app, compare the title line boxes at the stated viewport sizes. Check 360px and 390px widths, keyboard focus, title/select alignment, the No contact disclosure and circle strip, and the mobile sticky actions. Existing saving and leave-warning behaviour should be rechecked before publishing the visual changes.
