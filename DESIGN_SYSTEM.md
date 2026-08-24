# DESIGN_SYSTEM.md

## Purpose

This document defines the implementation rules and design system constraints used throughout the application.

All generated UI must follow these rules.

If this file conflicts with CLAUDE.md, DESIGN_SYSTEM.md takes precedence for implementation details.

The app runs on **daisyUI 5** (Tailwind v4, CSS-first config in `app/globals.css`), plus a
product-specific token layer, **`ir-*`** (defined in `app/design-tokens.css`, documented in
`DESIGN-TOKENS.md`), that a surface adopts as it gets a design pass. Component *behavior*
(dialogs, menus, comboboxes, positioning) comes from Headless UI / `@floating-ui/react` / `cmdk`
— never from a styling library. See `docs/migration/02-daisyui-migration-audit.md` for the
full audit of what has and hasn't adopted this system yet.

---

# Design Tokens

Always use design system tokens. Never hardcode colors.

Forbidden:

* bg-[#...]
* text-[#...]
* border-[#...]
* rgb(...)
* hsl(...)
* raw Tailwind palette classes (`bg-amber-50`, `text-gray-900`, `border-red-400`, etc.)

Use approved tokens only — either the daisyUI semantic layer or the `ir-*` product layer,
depending on which one the surface you're touching already uses. Don't mix an `ir-*` background
with a daisyUI-token border on the same element; match whatever the surrounding component uses.

**daisyUI semantic tokens** (default for anything not yet on the `ir-*` layer):

* bg-base-100 / bg-base-200 / bg-base-300
* text-base-content / text-base-content/60 (muted)
* bg-primary / text-primary / text-primary-content
* border-base-300
* bg-error / text-error, bg-warning / text-warning, bg-success / text-success

**`ir-*` product tokens** (once a surface has adopted the redesign — see `DESIGN-TOKENS.md`):

* bg-ir-surface / bg-ir-background / bg-ir-muted-surface
* text-ir-heading / text-ir-body / text-ir-muted
* bg-ir-primary / text-ir-primary / text-ir-primary-foreground
* border-ir-border
* bg-ir-success, bg-ir-warning, bg-ir-danger (+ `-foreground` variants for tinted-surface text)

---

# Border Radius

Only use approved radius tokens. Do not use arbitrary values.

Forbidden:

* rounded-[12px]
* rounded-[20px]
* rounded-[999px]

Use:

* **daisyUI**: `rounded-box` (cards/panels), `rounded-field` (inputs/buttons), `rounded-selector` (checkboxes/toggles/badges) — these track the active daisyUI theme's radius variables.
* **`ir-*` scale** (once a surface adopts it): `rounded-ir-xs` … `rounded-ir-xl`, `rounded-ir-full`, plus the component aliases `rounded-ir-button`, `rounded-ir-input`, `rounded-ir-card`.

---

# Borders

Standard UI uses 1px borders.

Avoid:

* border-2
* border-4
* thick borders

Exception:

* Active tab indicators
* Explicit design requirements

---

# Shadows

Use the `ir-*` shadow scale for elevation — subtle, single/double-layer shadows, not the
"oversized shadow" pattern CLAUDE.md's design philosophy warns against.

Use:

* shadow-ir-xs — default resting elevation for cards/panels
* shadow-ir-sm / shadow-ir-md — hover or raised state
* shadow-ir-lg / shadow-ir-xl — overlays, popovers, modals

Forbidden:

* Bare Tailwind shadow-sm/md/lg/xl/2xl (bypasses the token scale)
* Arbitrary shadow values (`shadow-[0_4px_12px_rgba(...)]`)

---

# Typography

Use project font variables only.

Examples:

* font-sans (Inter — current site-wide default)
* font-ir-sans / font-ir-mono (Geist — opt-in per component as surfaces adopt the `ir-*` layer)
* font-mono

Do not use:

* inline font families
* custom font declarations

Recommended hierarchy:

* font-medium → labels/navigation
* font-semibold → buttons/cards
* font-bold → page headings
* font-black → hero sections only

---

# Spacing

Use the standard spacing scale.

Avoid arbitrary values.

Forbidden:

* p-[13px]
* gap-[11px]
* mt-[17px]

Prefer:

* 1
* 2
* 3
* 4
* 6
* 8
* 10
* 12

Spacing should feel systematic. Once a surface adopts the `ir-*` layer, prefer the matching
`p-ir-*` / `gap-ir-*` / `m-ir-*` scale instead (see `DESIGN-TOKENS.md`).

---

# Focus States

Interactive elements must support keyboard navigation.

Preferred pattern (daisyUI layer):

focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-primary/30

`ir-*` layer equivalent:

focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ir-primary/40

---

# Hover States

Hover styles should use approved design tokens.

Avoid random opacity values and custom colors.

---

# Transitions

Prefer:

transition-colors duration-150

Avoid:

duration-300
duration-500
duration-700

unless explicitly required.

---

# Icons

Use a consistent icon system.

Recommended:

* Phosphor Icons (`@phosphor-icons/react`) — the icon set in active use across the app.

`lucide-react` remains a dependency for a small number of not-yet-migrated call sites; don't add
new usages of it — new UI should import from `@phosphor-icons/react`.

Use consistent sizing across similar UI patterns. Avoid arbitrary icon dimensions.

---

# Images

Never use HTML img elements.

Always use:

next/image

Requirements:

* width
* height
* alt text

must always be provided.

---

# Loading States

Use skeleton screens whenever possible (`components/ui/skeleton.tsx`, daisyUI `skeleton` class).

Skeletons should resemble the final layout.

Avoid full-page loading spinners.

---

# Mutation States

Actions that submit data must:

* show loading state
* disable repeated submission
* communicate progress

Prevent double-submits.

---

# Empty States

Every data-driven view should provide:

* helpful messaging
* clear next action
* contextual guidance

Avoid blank screens.

---

# Error States

Error messages should:

* explain the issue
* provide recovery options
* avoid technical jargon

---

# Dialogs

Use `components/ui/dialog.tsx` / `sheet.tsx` (Headless UI `Dialog` for behavior, daisyUI/Tailwind
for styling).

Avoid:

window.alert()
window.confirm()

Dialogs should include:

* title
* description
* primary action
* secondary action

---

# Tooltips

Use `components/ui/tooltip.tsx` — a CSS-only daisyUI `tooltip` implementation, no JS library.

Do not build custom tooltip implementations.

---

# Tables

Large datasets may scroll horizontally.

Do not force complex responsive transformations that reduce usability.

Prioritize readability.

---

# Truncation

When truncating text:

* use truncate
* ensure parent containers support shrinking

Avoid hidden overflow hacks that break layouts.

---

# Accessibility

All interactive elements must:

* be keyboard accessible
* provide focus states
* include accessible labels where necessary

Accessibility is required.

---

# Final Rule

When implementing UI:

1. Follow CLAUDE.md for design intent.
2. Follow DESIGN_SYSTEM.md for implementation details.
3. Prefer consistency over customization.
4. Prefer system rules over personal preference.
