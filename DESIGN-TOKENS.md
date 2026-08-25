# DESIGN-TOKENS.md

## Purpose

This document is the **Phase 1** deliverable of the IdeaRoads UI/UX redesign: a centralized, reusable design token system, built additively on top of the existing codebase.

Every token below lives in a dedicated `ir-` (IdeaRoads) namespace, separate from the rest of
the app's styling layer. Since Phase 1 landed, the app has also completed a full **shadcn →
daisyUI migration** (see `docs/migration/02-daisyui-migration-audit.md`): the old shadcn token
set (`bg-primary`, `text-foreground`, `border-border`, etc. in shadcn's HSL-variable form) has
been **fully removed**. Pages that haven't yet adopted the `ir-` tokens below now render with
daisyUI's own semantic classes (`bg-primary`, `text-base-content`, `border-base-300`, ...)
instead of shadcn's.

Phase 2 — migrating individual pages/components from daisyUI's default classes to the `ir-`
tokens documented here — is ongoing, one surface at a time.

> Note: `DESIGN.md` in this repo is a captured reference analysis of an external brand (Vercel's marketing site) used as a design-language reference, not IdeaRoads' own spec — it predates this token system and uses a different palette (near-black ink primary). `DESIGN_SYSTEM.md` encodes today's *implementation rules* for the *current* (daisyUI + `ir-*`) UI and has been updated to match — see that file directly rather than relying on this note.

---

## How the tokens work

Tailwind v4 (already in use here) generates utility classes directly from CSS custom properties declared in an `@theme` block — no `tailwind.config.js` needed. All new tokens live in **`app/design-tokens.css`**, imported once from `app/globals.css`. Raw values are declared in `:root` / `.dark`; a `@theme inline` block maps them into Tailwind's theme so utilities like `bg-ir-primary`, `rounded-ir-card`, `shadow-ir-md`, `p-ir-lg`, `text-ir-h1`, `ease-ir-standard` are generated automatically the moment a component uses them.

Two scales (z-index, animation duration) are **plain CSS custom properties**, not Tailwind theme namespaces — Tailwind v4 doesn't expose an extensible theme namespace for these two (verified against the installed `tailwindcss` package: `z-*` and `duration-*` utilities already accept bare numbers directly, e.g. `duration-150`, `z-50`). Use the documented CSS variables in custom CSS/inline styles, or the bare-number utility with the same value (e.g. `z-[var(--z-ir-modal)]` or simply `z-40`).

---

## Color Tokens

| Token (CSS var) | Utility | Light | Dark* | Use |
|---|---|---|---|---|
| `--ir-primary` | `bg-ir-primary` / `text-ir-primary` | `#1297FD` | `#1297FD` | Primary brand color, primary CTAs |
| `--ir-primary-hover` | `bg-ir-primary-hover` | `#0B84E8` | `#3AA9FD` | Primary hover state |
| `--ir-primary-light` | `bg-ir-primary-light` | `#8BCAF9` | `#1B3A5C` | Tints, highlights, light accents |
| `--ir-primary-foreground` | `text-ir-primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text/icons on primary fills |
| `--ir-background` | `bg-ir-background` | `#FCFCFC` | `#0F1115` | Page background |
| `--ir-surface` | `bg-ir-surface` | `#FFFFFF` | `#171A1F` | Cards, dialogs, popovers |
| `--ir-border` | `border-ir-border` | `#E3E4E6` | `#2A2E35` | Default hairline borders |
| `--ir-muted-surface` | `bg-ir-muted-surface` | `#F5F7FA` | `#1C1F25` | Inset panels, subtle fills |
| `--ir-text-heading` | `text-ir-heading` | `#1F2937` | `#F3F4F6` | Headings |
| `--ir-text-body` | `text-ir-body` | `#4B5563` | `#C3C7CE` | Body copy |
| `--ir-text-muted` | `text-ir-muted` | `#9CA3AF` | `#6B7280` | Placeholders, captions, low-priority text |
| `--ir-success` / `-foreground` | `bg-ir-success` | `#22C55E` | `#34D399` | Success state |
| `--ir-warning` / `-foreground` | `bg-ir-warning` | `#F59E0B` | `#FBBF24` | Warning state |
| `--ir-danger` / `-foreground` | `bg-ir-danger` | `#EF4444` | `#F87171` | Destructive/error state |

\* **Dark values were not specified in the brief.** They're proposed counterparts in the same hue families, kept isolated in `.dark` — confirm with design before any dark-mode surface adopts them.

## Typography Tokens

**Font**: [Geist](https://vercel.com/font) (via the official `geist` npm package — added as a new dependency), loaded additively as `--font-geist-sans` / `--font-geist-mono` in `app/layout.tsx`. The site-wide active font remains **Inter** (`font-sans`) until pages are redesigned — swapping it now would change every existing page's look, which Phase 1 explicitly avoids. `font-ir-sans` / `font-ir-mono` utilities are ready to use per-component ahead of that migration.

| Token | Utility | Size / Line-height | Weight | Use |
|---|---|---|---|---|
| `--text-ir-h1` | `text-ir-h1` | 36px / 44px | 600 | Page titles |
| `--text-ir-h2` | `text-ir-h2` | 30px / 38px | 600 | Section headings |
| `--text-ir-h3` | `text-ir-h3` | 24px / 32px | 600 | Sub-section headings |
| `--text-ir-h4` | `text-ir-h4` | 20px / 28px | 600 | Card / panel titles |
| `--text-ir-body-lg` | `text-ir-body-lg` | 18px / 28px | 400 | Lead paragraphs |
| `--text-ir-body-md` | `text-ir-body-md` | 16px / 24px | 400 | Default body text |
| `--text-ir-body-sm` | `text-ir-body-sm` | 14px / 20px | 400 | Secondary text, labels |
| `--text-ir-body-xs` | `text-ir-body-xs` | 12px / 16px | 400 | Captions, metadata |

Composed helper classes (`.ir-heading-1`…`.ir-heading-4`, `.ir-body`, `.ir-body-sm`) bundle font-family + size + weight + line-height + heading/body color in one class — see `app/design-tokens.css`.

## Spacing Scale

4px base unit, exposed as `--spacing-ir-*` → generates `p-ir-*`, `m-ir-*`, `gap-ir-*`, `space-x-ir-*`, `inset-ir-*`, etc.

| Token | Value |
|---|---|
| `ir-xs` | 4px |
| `ir-sm` | 8px |
| `ir-md` | 12px |
| `ir-lg` | 16px |
| `ir-xl` | 24px |
| `ir-2xl` | 32px |
| `ir-3xl` | 40px |
| `ir-4xl` | 48px |

## Border Radius Scale

| Token | Utility | Value |
|---|---|---|
| `--radius-ir-xs` | `rounded-ir-xs` | 4px |
| `--radius-ir-sm` | `rounded-ir-sm` | 6px |
| `--radius-ir-md` | `rounded-ir-md` | 8px |
| `--radius-ir-lg` | `rounded-ir-lg` | 12px |
| `--radius-ir-xl` | `rounded-ir-xl` | 16px |
| `--radius-ir-full` | `rounded-ir-full` | 9999px |

**Standardized component radii** (aliases onto the scale above):
| Element | Token | Utility | Resolves to |
|---|---|---|---|
| Button | `--radius-ir-button` | `rounded-ir-button` | 6px |
| Input | `--radius-ir-input` | `rounded-ir-input` | 6px |
| Card | `--radius-ir-card` | `rounded-ir-card` | 12px |

Note: pages not yet on the `ir-` scale now render with daisyUI's own radius variables
(`rounded-box`, `rounded-field`, `rounded-selector`, tracking the active daisyUI theme) rather
than a fixed `0`/square radius — that was true only prior to the daisyUI migration. Phase 2
moves individual surfaces from daisyUI's radius classes to the `ir-radius-*` scale below.

## Shadow Scale

Subtle, single/double-layer shadows — not the "oversized shadow" pattern CLAUDE.md's design philosophy warns against.

| Token | Utility |
|---|---|
| `--shadow-ir-xs` | `shadow-ir-xs` |
| `--shadow-ir-sm` | `shadow-ir-sm` |
| `--shadow-ir-md` | `shadow-ir-md` |
| `--shadow-ir-lg` | `shadow-ir-lg` |
| `--shadow-ir-xl` | `shadow-ir-xl` |

## Z-Index Tokens

Plain CSS custom properties (see "How the tokens work" above).

| Token | Value | Use |
|---|---|---|
| `--z-ir-base` | 0 | Default stacking |
| `--z-ir-dropdown` | 10 | Menus, comboboxes |
| `--z-ir-sticky` | 20 | Sticky headers/sidebars |
| `--z-ir-overlay` | 30 | Backdrop/scrim layers |
| `--z-ir-modal` | 40 | Dialogs, drawers |
| `--z-ir-popover` | 50 | Popovers, tooltips above modals |
| `--z-ir-toast` | 60 | Toast notifications |
| `--z-ir-banner` | 9999 | Top-level system banners (matches the existing impersonate banner's `z-[9999]`) |

## Animation Duration Tokens

Plain CSS custom properties, plus matching Tailwind `ease-ir-*` utilities from a real theme namespace.

| Token | Value |
|---|---|
| `--duration-ir-fast` | 100ms |
| `--duration-ir-base` | 150ms |
| `--duration-ir-slow` | 200ms |
| `--duration-ir-slower` | 300ms |

| Easing token | Utility | Curve |
|---|---|---|
| `--ease-ir-standard` | `ease-ir-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-ir-decelerate` | `ease-ir-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-ir-accelerate` | `ease-ir-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` |

## Reusable Utility Classes

Composed, opt-in helper classes in `app/design-tokens.css` (`@layer components`), unused by any current page:

- `.ir-heading-1` / `.ir-heading-2` / `.ir-heading-3` / `.ir-heading-4` — heading typography + color
- `.ir-body` / `.ir-body-sm` — body typography + color
- `.ir-card` — surface + border + card radius + xs shadow
- `.ir-panel` — muted surface + border + md radius
- `.ir-btn-base` / `.ir-btn-primary` — button shape/typography/transition + primary fill
- `.ir-input-base` — input shape/border/focus ring using the primary color

---

## Files Changed

| File | Why |
|---|---|
| `app/design-tokens.css` (new) | Centralized token definitions: color, typography, spacing, radius, shadow, z-index, duration/easing, plus the reusable component-level utility classes. |
| `app/globals.css` | Added one `@import "./design-tokens.css";` line to wire the token file into the existing Tailwind build. No other lines changed. |
| `app/layout.tsx` | Loads `GeistSans` / `GeistMono` from the new `geist` package as additional font CSS variables, so `font-ir-sans` / `font-ir-mono` resolve. The active site-wide font (Inter, `font-sans`) is unchanged. |
| `package.json` / `pnpm-lock.yaml` | Added the `geist` dependency (Vercel's official self-hosted Geist font package — the requested typeface). |
| `DESIGN-TOKENS.md` (new, this file) | Documents the full token set for the redesign to reference in later phases. |

## Verification

- `pnpm typecheck` — passes.
- `pnpm build` — production build succeeds; compiled CSS output confirmed to contain the new `--ir-*` custom properties and the Geist font variable chain, with zero new utility classes emitted (since no component references them yet — expected Tailwind v4 JIT behavior, confirming zero visual impact on existing pages).
- `pnpm lint` — no new errors introduced by these changes (one pre-existing, unrelated `noDescendingSpecificity` warning in `globals.css` predates this change; a separate set of pre-existing `useButtonType` errors elsewhere in the codebase are unrelated to this work).

## Design Tokens Created — Summary

- **Color**: 13 semantic tokens (primary + hover + light + foreground, background, surface, border, muted-surface, heading/body/muted text, success/warning/danger + foregrounds), each with light and dark values.
- **Typography**: Geist font family tokens (sans + mono) + 4-step heading scale + 4-step body scale, each with paired line-height.
- **Spacing**: 8-step scale (4px–48px, 4px base unit).
- **Border radius**: 6-step scale (4px–full) + 3 standardized component aliases (button, input, card).
- **Shadow**: 5-step scale (xs–xl), subtle/professional weight.
- **Z-index**: 8 semantic layering tokens (base through banner).
- **Animation**: 4 duration tokens + 3 easing-curve tokens (Tailwind-native `ease-ir-*` utilities).
