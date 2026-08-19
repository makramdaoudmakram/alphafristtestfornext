import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True when the event target is inside a portaled combobox panel or trigger. */
export function isComboboxOverlayTarget(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : target instanceof Text
        ? target.parentElement
        : null;
  if (!el) return false;
  return Boolean(
    el.closest('[data-combobox-panel="true"]') ||
      el.closest('[data-combobox-root="true"]')
  );
}

/**
 * Radix Dialog outside-events expose the real click/focus target on
 * `detail.originalEvent`, not `event.target`.
 */
export function isComboboxOverlayEvent(event: {
  target?: EventTarget | null;
  detail?: { originalEvent?: Event };
}): boolean {
  const original = event.detail?.originalEvent?.target ?? event.target;
  return isComboboxOverlayTarget(original ?? null);
}
