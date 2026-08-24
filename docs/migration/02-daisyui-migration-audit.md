# daisyUI Migration Audit

**Date:** 2026-08-10
**Status:** Substantially complete

Audit of the shadcn/Radix/cva → daisyUI migration, checking whether the
codebase has reached the target end-state:

```
Custom/shadcn-style tokens          daisyUI theme tokens
Custom Tailwind component styles →  daisyUI component classes
components/ui/*                     Headless UI ONLY where behavior is needed
Headless UI behavior                Tailwind utilities ONLY for layout/custom details
Tailwind utilities
```

## TL;DR

The migration is **substantially complete and well-executed**. There are no
functional shadcn/Radix/cva remnants anywhere in `app/` or `components/` —
dependencies, config, tokens, and every file in `components/ui/` have been
converted. The remaining gaps are: (1) two root-level docs
(`DESIGN_SYSTEM.md`, `DESIGN-TOKENS.md`) that describe the *old* shadcn
token system and are now stale/misleading relative to the actual code, (2)
a small number of components where a daisyUI class is nominally present
but its visual output is fully overridden by a hand-built, non-daisyUI
`ir-*` styling layer (checkbox, switch, radio-group), and (3) a couple of
isolated hardcoded-color spots that bypass the token system. None of these
are shadcn remnants — they're deliberate custom-design-system additions
layered on top of daisyUI, but worth a decision against the stated
end-state ("daisyUI component classes instead of custom Tailwind component
styles").

---

## 1. Config check

`package.json`:
- `daisyui: ^5.7.14` — installed.
- `@radix-ui/*` — **absent** (fully removed).
- `class-variance-authority` — **absent** (fully removed); no `cva()` usage anywhere in the repo.
- `tailwind-merge: ^3.6.0` and `clsx: ^2.1.1` — present, used together via `cn()` in `lib/utils.ts`. Framework-agnostic utility, not shadcn-specific — fine to keep.
- `@headlessui/react: ^2.2.10`, `@floating-ui/react: ^0.26.28`, `cmdk: ^1.1.1` — present, used correctly for **behavior only** (dialogs, menus, listboxes, comboboxes, positioning).
- No `tailwindcss-animate`; replaced by `tw-animate-css`, imported in `app/globals.css`.
- No `components.json` (shadcn CLI config) anywhere in the repo — fully removed, not just orphaned.

**Tailwind config**: Tailwind v4, so no `tailwind.config.js`. Config is CSS-based in `app/globals.css`:

```css
@plugin "daisyui" {
  themes:
    light --default,
    dark;
}
```

Only the two standard built-in daisyUI themes (`light`, `dark`) are registered. An in-code comment documents this as intentional:

> "Standard built-in daisyUI themes only — migration phase. The product-specific theme (mapped through this app's own `--ir-*` tokens in design-tokens.css) is deliberately deferred to a follow-up branding pass."

A custom daisyUI theme (`@plugin "daisyui/theme"` block) has **not** been defined yet — the app instead layers its own `--ir-*` token system on top of the stock daisyUI light/dark themes. Known, called-out gap, not an oversight.

`app/globals.css` also defines `@custom-variant` shims (`data-closed`, `data-selected`, `data-disabled`, `data-active`), documented as "local replacements for the subset of the (now-removed) shadcn package's custom variants that are still consumed" — copied CSS logic, not a dependency.

## 2. `components/ui/*` audit (all 37 files)

No file uses `cva`/`class-variance-authority`. No file imports `@radix-ui/*`. Every "variant" system is now a hand-rolled `Record<Variant, string>` + `cn()` pattern composing daisyUI classes with Tailwind utilities.

| File | Status | Notes |
|---|---|---|
| `button.tsx` / `button-variants.ts` | Converted | `btn`, `btn-primary`, `btn-outline`, `btn-ghost`, `btn-link`, `btn-square` as base layer; Tailwind utilities layered on top only for admin-panel-specific type/sizing treatment (documented rationale in-file). |
| `badge.tsx` | Converted | `badge`, `badge-neutral`, `badge-outline`, `badge-ghost`. |
| `card.tsx` | Converted | `card`, `card-title`, `rounded-box`. |
| `input.tsx` | Converted | `input` daisyUI class; colors driven by `ir-*` tokens rather than daisyUI semantic colors. |
| `textarea.tsx` | Converted | `textarea` daisyUI class. |
| `checkbox.tsx` | Partial/hybrid | daisyUI `checkbox` class applied to native `<input>`, then fully neutralized (`appearance-none border-0 bg-transparent shadow-none before:content-none`); visible box/check is a hand-built `<span>` styled with `ir-*` tokens + Tailwind. daisyUI's own checkbox visuals don't render. |
| `switch.tsx` | Partial/hybrid | Same pattern: `toggle` class applied but neutralized; thumb/track fully custom via `ir-*` tokens. |
| `radio-group.tsx` | Partial/hybrid | Same pattern: `radio` class applied but neutralized; visual dot fully custom via `ir-*` tokens. |
| `select.tsx` | Converted, correct pattern | Behavior via Headless UI `Listbox`/`ListboxButton`/`ListboxOptions` + `@floating-ui/react`; styling via daisyUI/Tailwind. Custom listbox rather than native `<select class="select">` since it needs custom option rendering. |
| `dialog.tsx` | Converted, correct pattern | `@headlessui/react` `Dialog`/`DialogBackdrop`/`DialogPanel` for behavior; daisyUI/Tailwind for styling. Ports a small `DialogContext` shim to preserve the old `<DialogTrigger asChild>` call-site API. |
| `dropdown-menu.tsx` | Converted, correct pattern | Headless UI `Menu`/`MenuButton`/`MenuItems` + `@floating-ui/react` for positioning (documented rationale for bypassing Headless UI's own `anchor` positioning due to a flip/shift ordering bug). |
| `sheet.tsx` | Converted, correct pattern | Same Headless UI Dialog primitives as `dialog.tsx`, styled as a slide-over panel. |
| `popover.tsx` | Converted, correct pattern | Built directly on `@floating-ui/react` hooks (`useFloating`, `useClick`, `useDismiss`, `useRole`, `FloatingFocusManager`, `FloatingPortal`) — necessary because neither Headless UI's Popover nor Menu support full two-way controlled state, which some call sites require. |
| `command.tsx` | Converted, correct pattern | Built on `cmdk` for combobox/command-palette behavior; daisyUI/Tailwind styling on top. |
| `tooltip.tsx` | Converted, exemplary | No JS library — daisyUI's native CSS-only `tooltip` class + `data-tip`, with a comment explaining why no library is needed. Cleanest example of "headless only where behavior is needed." |
| `accordion.tsx` | Converted | Custom-built (no library), Tailwind + phosphor icons; not using daisyUI's `collapse` class, but no shadcn/Radix remnant. |
| `tabs.tsx` | Converted | Custom-built, uses `data-active` custom variant; not using daisyUI's `tabs`/`tab` classes directly. |
| `alert.tsx` | Converted | Uses `bg-base-100`, `text-error` (daisyUI semantic tokens), but not the daisyUI `alert`/`alert-error` component classes — fully custom layout via Tailwind. |
| `table.tsx` | Converted | daisyUI `table` class on the root, `ir-*` tokens elsewhere. |
| `progress.tsx` | Not using daisyUI's component | Hand-built with two `<div>`s (track + fill) using `bg-base-200`/`bg-primary`. daisyUI ships a native `<progress className="progress">` element that isn't used; tokens are correct, markup bypasses the daisyUI `progress` primitive. |
| `skeleton.tsx` | Converted | daisyUI `skeleton` class. |
| `avatar.tsx` | Converted | daisyUI `avatar` class as base; sizing/border/fallback custom via `ir-*` tokens. |
| `pagination.tsx` | Converted | Built on top of the already-converted `Button`; not using daisyUI's `join` pagination pattern, but not a shadcn remnant. |
| `date-picker.tsx` | Converted, correct pattern | Popover (Floating UI) + Calendar, styled with `ir-*` tokens. |
| `calendar.tsx` | Converted | Wraps `react-day-picker`; `base-content`-family daisyUI tokens and phosphor icons. |
| `chart.tsx` | Converted | Wraps Recharts; legend/tooltip use `base-content` daisyUI tokens. |
| `command.tsx`, `search-input.tsx`, `password-input.tsx`, `input-group.tsx` | Converted | `SearchInput`/`PasswordInput` composed on top of shared `InputGroup` primitives rather than reimplementing input chrome per-component. |
| `confirm-dialog.tsx` | Converted | Thin wrapper around the already-converted `Dialog`/`Button`. |
| `color-swatch-picker.tsx` | Converted | Plain `<button>` swatches with `ir-*` tokens; inline `style` only for data-driven swatch hex colors. |
| `sonner.tsx` | Converted | Styled via CSS custom properties mapped to `ir-*` tokens, theme wired through `next-themes`. |
| `image-lightbox.tsx`, `image-preview-thumbnail.tsx`, `relative-time.tsx`, `skip-link.tsx`, `square-avatar.tsx`, `success-check.tsx`, `page.tsx` | Converted | All use `ir-*`/daisyUI base tokens; no shadcn/cva/Radix traces. |

**Net**: 0 of 37 files retain shadcn/Radix/cva machinery. 3 files (`checkbox.tsx`, `switch.tsx`, `radio-group.tsx`) apply a daisyUI class name but override it entirely with a custom `ir-*`-token visual — needs a decision on whether that's intentional brand deviation or something to reconcile with daisyUI's own themed form controls. 1 file (`progress.tsx`) doesn't use daisyUI's native `progress` element at all.

## 3. Design tokens

`app/globals.css`:
- **No leftover shadcn CSS variables.** Searched for the classic shadcn HSL-format set (`--background`, `--foreground`, `--primary`, `--secondary`, `--card`, `--popover`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`) — none exist in `app/globals.css` or `app/design-tokens.css`.
- daisyUI configured via `@plugin "daisyui" { themes: light --default, dark; }` (daisyUI 5 CSS-first config for Tailwind v4).
- Theme switching wired through `next-themes` with `attribute={["data-theme", "class"]}` in `components/providers.tsx` — `data-theme` drives daisyUI's compiled theme selectors, `class` (`.dark`) drives the app's own token overrides. Correct daisyUI 5 pattern.
- A second, deliberate token layer exists: `app/design-tokens.css` defines a separate `--ir-*` (IdeaRoads) namespace — colors, typography scale, spacing, radius, shadows, easing, z-index — mapped into Tailwind's `@theme inline` block, generating utilities like `bg-ir-primary`, `rounded-ir-card`, `shadow-ir-md`. Not a shadcn leftover; a purpose-built product design system layered on daisyUI, per its own header comment: "The app's legacy shadcn token set has since been removed; unconverted pages now use daisyUI's semantic classes directly... instead."
- **Stale note**: `DESIGN-TOKENS.md`'s own text still says *"Every token below lives in a new `ir-` namespace, separate from the shadcn tokens (`bg-primary`, `text-foreground`, `border-border`, etc.) the app currently renders with"* and *"Phase 2 ... will migrate individual pages/components from the old shadcn tokens to the `ir-` tokens"* — now **inaccurate**: the shadcn tokens are gone; the app renders with daisyUI tokens (`bg-primary`, `text-base-content`, etc.) or `ir-*` tokens, never `text-foreground`/`border-border`. This doc predates the actual migration commits and hasn't been refreshed.

## 4. Usage scan across `app/` and `components/`

- **Shadcn-style class tokens** (`bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-popover`, `text-popover-foreground`, `bg-primary-foreground` (non-`ir-`), `bg-secondary`/`text-secondary-foreground`, `bg-accent`/`text-accent-foreground`, `text-muted-foreground`, `bg-destructive`/`text-destructive-foreground`, `border-input`, `ring-ring`): **zero matches** anywhere in `app/` or `components/`.
- **`@radix-ui/*` imports**: zero matches anywhere.
- **`cva`/`class-variance-authority` imports**: zero matches anywhere.
- **"shadcn" mentions in code/docs**: only inside `DESIGN-TOKENS.md` (explaining the old system, now stale). No `TODO`/`FIXME` comments referencing daisyUI or the migration found anywhere in `app/`, `components/`, or `lib/`.
- **Hardcoded Tailwind palette colors** (bypassing both daisyUI and `ir-*` tokens): essentially none. Full-repo grep for `bg-/text-/border-{gray,slate,zinc,red,blue,...}-N` turned up only:
  - `components/ui/dialog.tsx:179` and `components/ui/sheet.tsx:171` — `bg-black` used only for the modal backdrop overlay (legitimate, common exception; no themed equivalent needed for a black scrim).
  - `components/orbit/impersonate-banner-client.tsx` — uses raw `amber-*` Tailwind classes (`bg-amber-50`, `text-amber-900`, `border-amber-400`, dark variants) instead of the `warning`/`ir-warning` tokens for its "Impersonating" banner. Minor, isolated, arguably intentional (distinct alarm color independent of theme), but off-token.
  - `components/notifications/notification-bell.tsx:65` — `text-white` on an `ir-danger` badge background; safe/trivial (white always reads on the danger red regardless of theme) but off-token strictly speaking.
- **Raw hand-built `<button>` elements outside `components/ui/`**: ~100 occurrences across `app/` and `components/`. Spot-checked a broad sample (setup wizard, notification items, roadmap cards, changelog editor, category/status lists, comment reactions, etc.) — none reconstruct shadcn-style button chrome with raw palette colors; consistently use `ir-*` tokens or plain unstyled interactive `<button>`s (icon-only triggers, toggle rows, etc.).
- daisyUI component-class adoption is broad: `card` appears in 99 files, `input` in 73, `select` in 38, `badge` in 31, `modal` in 21, `toggle`/`join` in 18 each, `table`/`menu` in 15–16, `dropdown`/`avatar` in 14 each. (Many are indirect via the shared `Button`/`Input`/`Card` components rather than literal class strings in the consuming file.)
- No `components.json`, no orphaned `*shadcn*` files, no leftover `ui/` imports pointing at a pre-migration path.

## 5. Docs vs. code

- **`docs/features/*`, `docs/implementation/*`, `docs/migration/*`**: no shadcn/Radix/cva references found anywhere.
- **`docs/implementation/TECH-STACK.md`**, **`README.md`**, **`PROJECT_REVIEW.md`**: all up to date — correctly document daisyUI 5 + Headless UI + `ir-*` tokens as the current stack, no shadcn mentions.
- **`DESIGN_SYSTEM.md`** (repo root): **stale — describes the old shadcn implementation rules**, not the current daisyUI-based system. Instructs engineers to use tokens like `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-destructive` — none of which exist in the codebase anymore — and to use `--radius-xs`…`--radius-xl` (shadcn's radius scale) rather than the actual `--radius-ir-*` scale now in use. Also forbids shadows unless explicitly required (`shadow-sm`/`shadow-md`/etc.), which contradicts current code using `shadow-ir-xs`/`shadow-ir-sm`/`shadow-ir-md` throughout (`button-variants.ts`, `card.tsx`, `input.tsx`, etc.). **Should be rewritten or retired** — if followed literally, it will regenerate shadcn-style class names, including by future AI agent sessions reading it as source of truth.
- **`DESIGN-TOKENS.md`** (repo root): **partially stale**. Accurate as a reference for the `ir-*` token system itself, but its framing ("Phase 1... Phase 2 will migrate from shadcn tokens... nothing changes how the app looks yet") describes a pre-migration snapshot and is no longer true now that the shadcn→daisyUI migration commits have landed. It even flags this itself in a footnote: *"`DESIGN_SYSTEM.md` encodes today's implementation rules... for the current UI. Both will need a pass once pages actually adopt the tokens below — out of scope for Phase 1."* — that follow-up pass hasn't happened yet.
- **`DESIGN.md`** (repo root): not migration-relevant — an external reference/analysis of Vercel's marketing site design language (per its own YAML frontmatter and `DESIGN-TOKENS.md`'s annotation), predating and unrelated to this app's token system. No action needed beyond what `DESIGN-TOKENS.md` already notes.
- No dedicated `docs/DESIGN-SYSTEM.md` (lowercase path) exists; the equivalent is the root-level `DESIGN_SYSTEM.md` covered above.

---

## Punch list

### Fully migrated (no action needed)
- Dependencies: no `@radix-ui/*`, no `class-variance-authority`, no `components.json`.
- daisyUI installed and configured via CSS-first `@plugin "daisyui"` (Tailwind v4), themes `light`/`dark` registered, wired to `next-themes` via `data-theme`+`class`.
- No shadcn CSS variables anywhere in `globals.css`/`design-tokens.css`.
- All 37 files in `components/ui/` are free of cva/Radix; core primitives (`button`, `badge`, `card`, `input`, `textarea`, `table`, `skeleton`) use real daisyUI component classes.
- Headless UI / `@floating-ui/react` / `cmdk` used correctly and only for behavior (`dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `sheet.tsx`, `popover.tsx`, `command.tsx`) — styling layered separately via daisyUI/Tailwind, matching the target end-state.
- No shadcn-token classes (`bg-background`, `text-foreground`, `bg-card`, `bg-destructive`, etc.) anywhere in `app/` or `components/`.
- `README.md`, `PROJECT_REVIEW.md`, `docs/implementation/TECH-STACK.md`, and all `docs/features/*`/`docs/implementation/features/*` correctly describe the current daisyUI-based stack.

### Partially migrated / worth a decision
- `components/ui/checkbox.tsx`, `switch.tsx`, `radio-group.tsx`: daisyUI class (`checkbox`/`toggle`/`radio`) present but visually neutralized in favor of a fully custom `ir-*`-token-driven appearance. Confirm whether this is the intended permanent design or a leftover that should eventually lean on daisyUI's own themed form-control styling.
- `components/ui/progress.tsx`: hand-built two-div progress bar; daisyUI ships a native `progress`/`progress-primary` element that isn't used. Tokens are correct, just not using the daisyUI component primitive itself.
- `components/ui/tabs.tsx`, `accordion.tsx`, `alert.tsx`: custom-built rather than using daisyUI's `tabs`/`collapse`/`alert` component classes. Not shadcn remnants, but not adopting daisyUI's dedicated components either — confirm this is deliberate.
- `components/orbit/impersonate-banner-client.tsx`: uses raw `amber-*` Tailwind palette classes instead of `warning`/`ir-warning` tokens.
- `components/notifications/notification-bell.tsx:65`: minor off-token `text-white`.

### Not migrated / stale (docs only — no app code affected)
- `DESIGN_SYSTEM.md` (repo root): describes the old shadcn token vocabulary and forbids shadows that current code uses pervasively (`shadow-ir-*`). Should be rewritten to reflect daisyUI + `ir-*` tokens, or it will actively mislead future contributors/AI agents into reintroducing shadcn-style class names.
- `DESIGN-TOKENS.md` (repo root): accurate on the `ir-*` token catalogue itself, but its framing narrative ("Phase 1, nothing changed yet, shadcn tokens still render the app") is factually out of date post-migration and should be updated to reflect that the shadcn token layer has since been fully removed.

No functional/runtime shadcn or Radix code remains anywhere in the application; the remaining work is documentation cleanup (2 files) plus explicit confirmation of a small set of intentional-looking design decisions (checkbox/switch/radio visual approach, progress bar, tabs/accordion/alert component-class adoption, and the two off-token color spots).
