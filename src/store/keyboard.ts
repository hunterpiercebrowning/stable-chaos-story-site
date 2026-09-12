import { useEffect } from 'react';

/**
 * Global keyboard map. WS6 owns the real implementation:
 *   ↑ ↓ layers · ← → siblings · Enter focus · Esc back · `/` search ·
 *   `[` `]` panels · 1–4 emphasis · `P` presentation.
 *
 * For now it only wires the two shortcuts the shell already needs so the app is
 * usable, and exposes the "is the user typing?" guard every handler must use.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  );
}

export interface KeyboardHandlers {
  onSearch?: () => void;
  onEscape?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        handlers.onSearch?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
