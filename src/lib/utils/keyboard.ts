/**
 * True while an IME (Japanese, Vietnamese Telex, …) is composing. The Enter that
 * confirms a conversion must not also submit or advance; Safari reports it as
 * `key: 'Enter'` with `isComposing`, older Chrome as keyCode 229.
 */
export function isImeComposing(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}
