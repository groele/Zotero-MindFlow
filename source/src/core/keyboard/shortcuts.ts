const NATIVE_CONTROL_SELECTOR =
  'button, a[href], select, summary, [role="button"], [role="menuitem"], [role="option"], [role="combobox"]';

/** Keep unmodified editor shortcuts away from focused controls owned by Zotero or MindFlow. */
export function shouldHandleCanvasShortcut(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return true;
  return !(target as Element).closest(NATIVE_CONTROL_SELECTOR);
}
