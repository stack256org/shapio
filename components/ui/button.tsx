"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import type { ButtonSize, ButtonVariant } from "@/components/ui/button-variants"
import { buttonVariants } from "@/components/ui/button-variants"
import { mergeProps } from "@/lib/merge-props"
import { cn } from "@/lib/utils"

const MotionButton = motion.create("button")

const motionComponentCache = new WeakMap<
  object,
  React.ComponentType<Record<string, unknown>>
>()
// String tags (e.g. "a", "div") can't be WeakMap keys — they're primitives,
// not objects — but they're a small, fixed set of interned values, so a
// plain Map (never garbage-collected, unlike the WeakMap above) is safe.
const motionStringComponentCache = new Map<
  string,
  React.ComponentType<Record<string, unknown>>
>()

// asChild renders the button's variant classes/animation onto an arbitrary
// child element (usually a <Link>) instead of a <button>. framer-motion's
// motion.create() needs a stable component reference per element type to
// animate correctly — a fresh one on every render gives the child a new
// component identity each time, forcing React to unmount/remount the DOM
// node (losing hover/focus state and any in-flight animation) instead of
// just re-rendering it. String tags and component types are wrapped once
// and cached rather than re-wrapped every render.
function getMotionComponent(type: React.ElementType) {
  if (typeof type === "string") {
    let cached = motionStringComponentCache.get(type)
    if (!cached) {
      cached = motion.create(type)
      motionStringComponentCache.set(type, cached)
    }
    return cached
  }
  let cached = motionComponentCache.get(type)
  if (!cached) {
    cached = motion.create(type as React.ComponentType<Record<string, unknown>>)
    motionComponentCache.set(type, cached)
  }
  return cached
}

// motion.create()'s props conflict with the native HTML drag-event handlers
// (onDrag/onDragStart/etc. have incompatible signatures) — Button never
// exposes native drag, so those keys are dropped from the prop surface.
type NativeButtonProps = Omit<
  React.ComponentProps<"button">,
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  disabled,
  children,
  ...props
}: NativeButtonProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}) {
  const shouldReduceMotion = useReducedMotion()
  // useReducedMotion() reads `window.matchMedia` synchronously during
  // render, so it resolves to a real boolean on the client's first render
  // but stays `null` during SSR (no `window`) — a guaranteed mismatch for
  // any visitor with the OS-level reduced-motion preference on. Trusting it
  // only after mount keeps the first client render identical to the server
  // HTML; the animation state settles a tick later, which is imperceptible.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  // Popover/dropdown/select triggers already animate their own open state —
  // a hover/tap scale on top of that reads as busy, so they opt out.
  const isPopupTrigger = props["aria-haspopup"] != null
  const canAnimate = mounted && !shouldReduceMotion && !disabled && !isPopupTrigger

  const ownProps: Record<string, unknown> = {
    "data-slot": "button",
    "data-variant": variant,
    "data-size": size,
    className: cn(buttonVariants({ variant, size, className })),
    disabled,
    transition: { duration: 0.1, ease: "easeOut" },
    whileHover: canAnimate ? { scale: 1.015 } : undefined,
    whileTap: canAnimate ? { scale: 0.97 } : undefined,
    ...props,
  }

  if (asChild) {
    // `children` is meant to be a single literal element (e.g. <Link>) at
    // every call site. If it isn't — most commonly because the caller built
    // it on the server and handed it down as a not-yet-resolved streamed
    // value — falling through to wrap it in a new <MotionButton> (a real
    // <button>) would nest an interactive element around the child's own
    // interactive element (e.g. <button><a>), which is invalid markup AND
    // drops the button's flex/gap styling from the icon+text (they're no
    // longer direct children of the `.btn` flex container) — visibly
    // resizing/repositioning the button. Rendering the child through
    // unmodified avoids ever fabricating that extra host element; callers
    // should construct asChild's child on the client (see
    // add-feedback-button.tsx) so this branch is never actually hit.
    if (!React.isValidElement(children)) {
      return children
    }
    const child = children as React.ReactElement<Record<string, unknown>>
    const MotionChild = getMotionComponent(child.type as React.ElementType)
    return <MotionChild {...mergeProps(ownProps, child.props)} />
  }

  return <MotionButton {...ownProps}>{children}</MotionButton>
}

export { Button, buttonVariants }
