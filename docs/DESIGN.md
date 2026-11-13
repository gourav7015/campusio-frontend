# Design system and redesign plan

Status: Phase 1 complete (design system, shell), plus the Apple-style palette, light/dark theme, redesigned sign-in and landing pages, and rebuilt **dashboards for all eight portals**. Inner pages are re-skinned (tokens, components, segmented tabs, quiet destructive buttons, chevron dropdowns, no emoji) and checked at phone width, but keep their original page layouts until their phase.

Method adapted from [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (CC BY 4.0): find the generic tells, set a direction from the product, then fix spacing, colour, icons, copy, type, layout, details and motion in that order.

## Stack

React 18, Vite, TypeScript (strict for new code, `allowJs` while old pages migrate), Tailwind 3, Radix primitives (shadcn-style, ours in `src/design/ui`), Lucide icons, Framer Motion, TanStack Query and Table, Recharts. Still to add when first used: React Hook Form + Zod (forms, Phase 3+), dnd-kit (timetable, Phase 4).

## Folders

| Path | Holds |
|---|---|
| `src/design/tokens.css` | Colour, radius, motion tokens; light and dark; one tone per portal |
| `src/design/ui/` | Button, Card, Badge, forms, Tabs, Dialog + Drawer, menus, Tooltip, Toast, DataTable, StatCard, Progress ring, empty/error/skeleton states |
| `src/design/charts/` | Chart theme from tokens, tooltip, ChartCard (links to the page behind it) |
| `src/design/lib/` | `cn`, theme (light/dark/system), motion presets |
| `src/shell/` | App shell, portal definitions (`portals.ts`), navigation, notifications, command search, user menu |
| `src/api/query.ts` | TanStack Query client, typed `useGet` / `useWrite` |
| `src/design/legacy.css` | Styles for pages built before the redesign; shrinks as pages move to Tailwind components |
| `src/design/Gallery.tsx` | Dev-only reference at `/design` (labelled sample data) |

## Tokens (Apple-inspired)

| Token | Light | Dark |
|---|---|---|
| Background | `#F5F5F7` | `#151516` |
| Surface | `#FFFFFF` | `#222224` |
| Secondary surface | `#F0F0F2` | `#2C2C2E` |
| Text | `#1D1D1F` | `#F5F5F7` |
| Secondary text | `#86868B` (tertiary) / `#68686D` (readable) | `#98989D` |
| Accent | `#0071E3` | `#2997FF` (text and accents; buttons stay `#0071E3`) |
| Border | `#D2D2D7` | `#38383A` |
| Success / warning / danger | `#248A3D` / `#B7791F` / `#D70015` | `#30D158` / `#FFD60A` / `#FF453A` |

Inter (variable) stands in for SF Pro, with Noto Sans Devanagari for Hindi. Radii: controls 10, cards 14, panels and dialogs 16. Light and dark are both token sets (`src/design/tokens.css`); no component uses a raw colour.

**Contrast adjustments.** WCAG AA is a stated requirement and some specified colours miss it, so the specified values stay as tokens and a few text-only variants sit beside them: `#86868B` is 3.6:1 on white (used only for placeholders and icons; readable secondary text is `#68686D`, 5.1:1); `#B7791F` and `#248A3D` text become darker `-ink` variants; form-field edges use `#8E8E93` (3.3:1) while dividers keep `#D2D2D7`; dark-mode solid fills carry near-black text because white on `#FF453A` is 3.4:1. To use the specified values exactly, change the tokens `--c-fg-2`, `--c-*-ink` and `--c-border-strong`.

**Theme.** Header toggle (sun in light, moon in dark) on every portal and on the sign-in pages; first visit follows the device; a choice is saved in `localStorage` (`erp.theme`); the account menu has "Match device" to go back to following the system; switching fades colours (disabled with reduced motion). One store (`src/design/lib/theme.ts`) keeps every toggle, other tabs and the first paint in step.

**Audit.** `AUDIT=1 npx playwright test tests/theme.spec.js` (from `e2e/`) visits every page of every portal in both themes and checks colour contrast with axe, writing `e2e/audit/<portal>.json`.

Rules: 4px spacing grid; two weights (400/500, 600 for headings); sentence case; tabular figures for numbers; hairline borders; no hue gradients, glows or emoji; motion only for feedback and entrances, one easing curve, reduced motion respected; every state (loading, empty, error) is designed.

## Portal personalities

All share the tokens and components. Each has its own shell variant, navigation and priorities.

| Portal | Variant | Character | World | Signature (built in its phase) |
|---|---|---|---|---|
| Platform | control (navy sidebar) | exact, calm, dense | an operations console | tenant health dot beside every school |
| School admin | workspace | orderly, capable | the school office | every card and chart links to its detail page |
| Teacher | teaching (compact, tab bar on phones) | quick, task-first | a classroom desk | the class switcher and the "pending today" strip |
| Student | personal (floating sidebar, tab bar) | warm, encouraging, not childish | a study desk | wallpapers, progress ring, attendance streak |
| Parent | personal | reassuring, plain | a family notice board | child switcher |
| Finance | workspace | precise, ledger-like | accounts book | tabular rupee figures, receipt layout |
| Transport | workspace | operational | a dispatch board | route line with stop sequence |
| Library | workspace | quiet, catalogue-first | shelves | book cover cards |
| Staff | personal | simple | a time card | check-in button |

## Phases

| # | Scope | Needs from the backend |
|---|---|---|
| 1 | **Done.** Tokens, components, shell, old pages re-skinned, tests | none |
| 2 | Sign-in and landing redesign, route protection review, permission-aware navigation | none |
| 3 | Platform portal: overview, school directory and detail, onboarding | Subscription plans, invoices, MRR/ARR, usage and support tickets do not exist: each needs a model + API first |
| 4 | School admin: dashboard, class and section management with transfers and bulk allocation, teacher assignments, timetable editor with drag and drop | Admissions, room assignment, teacher availability, section transfer history need API work. Class/section/timetable APIs exist |
| 5 | Teacher workspace | mostly exists |
| 6 | Student portal: hero, wallpapers, interactive widgets, badges, streaks | Badges and streaks derived from attendance and homework data (no new storage needed); wallpaper choice stored per student |
| 7 | **Parent portal** | Parent accounts, child links, parent-to-teacher messages, leave applications: all new in the backend |
| 8 | Finance | Refunds, expenses, income and adjustments are new. **Online payment needs a payment-gateway account (for example Razorpay)** |
| 9 | Transport | Maintenance, insurance and permit expiry records are new. Maps only where real route coordinates exist. Never fake GPS |
| 10 | Library | Reservations, publishers, authors are new; barcode input exists as text |
| 11 | Responsive, accessibility audit, performance (route-level code splitting; the bundle is 1.4 MB today), end-to-end tests |  |

Rule for every phase: no placeholder buttons, no invented data. A feature without a backend gets its backend first or is left out and listed here.

## Already done in Phase 1

* All portals use the new shell: collapsible sidebar (remembered), tablet/phone drawer, phone tab bar for student, teacher and staff, breadcrumbs, command search (Cmd/Ctrl+K) for admin and teacher, notifications, theme switch (light, dark, match device), skip link.
* Old pages: re-skinned through tokens; dialogs now trap focus and close on Escape; tables sort by clicking a header; toasts animate; decorative emoji removed from every page except the sign-in and landing pages (Phase 2); stat numbers are neutral with a status dot.
* Checks: typecheck, lint, 39 unit tests, build, 29 browser tests.

## Rebuilt pages (new hierarchy, TypeScript)

| Page | Idea |
|---|---|
| Landing, sign-in | Centered, quiet; one card per portal with its tone; theme toggle |
| Admin dashboard | "Needs attention" first (only items with a count), then four plain metrics, one main chart, a share list, three summary cards, searchable activity table; every card links to its page |
| Teacher dashboard | "Today": timetable timeline with the current period highlighted, a to-do list, what is due soon, then metrics and two charts |
| Platform dashboard | Attention list (expiring and expired subscriptions, suspended schools), subscription share, plan-usage bars per school in a searchable table |
| Finance dashboard | Overdue and unbilled students first, month by payment mode, four rupee figures (short form on phones: ₹2.75 Cr), one collection chart, searchable payments |
| Library dashboard | Overdue first, today's circulation, issues vs returns chart, most borrowed, categories, recent circulation |
| Transport dashboard | Buses short of crew and certificates due first, fleet metrics, riders vs seats, crew not on a bus |
| Staff dashboard | Check-in card, attendance and leave balances, latest payslip |
| Student dashboard | Personal welcome with five wallpapers (minimal, soft blue, midnight, nature, study focus), animated attendance ring, next-exam countdown, achievements worked out from the student's own records (no leaderboard), timetable, homework |

Shared patterns: `src/design/patterns.tsx` (AttentionList, ShareList, Facts, LinkCard), `src/components/Schedule.tsx` (day timeline). Wallpaper choice is a per-viewer convenience in `localStorage` and changes only the welcome card.

## Known gaps after Phase 1

* Pages other than the eight dashboards are re-skinned, not restructured: lists, forms and detail pages keep their legacy layouts (JavaScript, `.card`/`.btn` classes) until their phase. Verified at 390px with an automated overflow check over every page of every portal (none overflow).
* Student achievements and streak are derived from existing attendance, homework and result data. Wallpaper choice lives in the browser, not on the server.
* Bundle is one 1.4 MB file; route-level code splitting is Phase 11.
* Bulk actions that use `window.confirm` become proper confirmation dialogs as each page is rebuilt.
