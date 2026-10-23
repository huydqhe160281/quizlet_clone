/**
 * True on touch-first devices (phones, tablets). Focusing a text field there
 * pops the on-screen keyboard over half the screen, so auto-focus on open is
 * skipped and the user taps the field when they actually want to type.
 */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'number', 'password', 'tel', 'url']);

/** Elements that raise the on-screen keyboard when focused. */
export function isTextEntryElement(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable === true;
}
