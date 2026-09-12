import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getLayer, getNextLayer, getNode, getNodes, getPrevLayer, SECTOR_IDS } from '../data';
import type { Emphasis, Layer, Node } from '../data/types';
import { track } from '../lib/track';
import { useUi } from './ui';

/**
 * Global keyboard map (locked in build plan §0):
 *
 *   ↑ / ↓        previous / next layer
 *   ← / →        previous / next sibling node (first node when none is focused)
 *   Enter        focus the highlighted node, else the first node on the layer
 *   Esc          close, in priority: search → expanded video → focused node → presentation
 *   /            open search
 *   [  ]         toggle the left / right panel
 *   1 2 3 4      emphasis All / SynBio / Security / Systems (layers with emphasis only)
 *   P            toggle presentation mode
 *
 * Everything is ignored while the user is typing, while the search dialog is
 * open (it owns its own keys) and — except for Esc — while a video is expanded
 * (the player owns Space/Esc there).
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

/** Buttons and links handle Enter natively — never hijack it from them. */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return el.closest('button, a[href], [role="button"], [role="option"], summary') !== null;
}

/* ── pure key → action resolution (unit tested) ─────────── */

export type KeyAction =
  | { type: 'layer'; dir: -1 | 1 }
  | { type: 'sibling'; dir: -1 | 1 }
  | { type: 'enter' }
  | { type: 'escape' }
  | { type: 'search' }
  | { type: 'panel'; side: 'left' | 'right' }
  | { type: 'emphasis'; value: Emphasis }
  | { type: 'presentation' };

const EMPHASIS_BY_DIGIT: Record<string, Emphasis> = {
  '1': 'all',
  '2': SECTOR_IDS[0],
  '3': SECTOR_IDS[1],
  '4': SECTOR_IDS[2],
};

export interface KeyEventLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

/** Maps a keydown to an action, or `null` when the key is not bound. */
export function resolveKeyAction(e: KeyEventLike): KeyAction | null {
  if (e.key === 'Escape') return { type: 'escape' };
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  switch (e.key) {
    case 'ArrowUp':
      return { type: 'layer', dir: -1 };
    case 'ArrowDown':
      return { type: 'layer', dir: 1 };
    case 'ArrowLeft':
      return { type: 'sibling', dir: -1 };
    case 'ArrowRight':
      return { type: 'sibling', dir: 1 };
    case 'Enter':
      return { type: 'enter' };
    case '/':
      return { type: 'search' };
    case '[':
      return { type: 'panel', side: 'left' };
    case ']':
      return { type: 'panel', side: 'right' };
    case 'p':
    case 'P':
      return { type: 'presentation' };
    default: {
      const emphasis = EMPHASIS_BY_DIGIT[e.key];
      return emphasis ? { type: 'emphasis', value: emphasis } : null;
    }
  }
}

/** The sibling `dir` steps from `current`; the first node when nothing is focused. Clamped, no wrap. */
export function nextSibling(nodes: Node[], currentId: string | undefined, dir: -1 | 1): Node | undefined {
  if (nodes.length === 0) return undefined;
  if (!currentId) return nodes[0];
  const i = nodes.findIndex((n) => n.id === currentId);
  if (i < 0) return nodes[0];
  const j = Math.min(nodes.length - 1, Math.max(0, i + dir));
  return j === i ? undefined : nodes[j];
}

/* ── the hook ────────────────────────────────────────────── */

function parseRoute(pathname: string): { layer: Layer | undefined; nodeId: string | undefined } {
  const [rawLayer, rawNode] = pathname.split('/').filter(Boolean);
  const layer = getLayer(rawLayer ?? 'welcome');
  const node = layer && rawNode ? getNode(rawNode) : undefined;
  return { layer, nodeId: node?.id };
}

/**
 * Mounts the global keyboard map once, in `AppShell`. Listens in the capture
 * phase so Esc can be arbitrated in one place; anything it handles is stopped
 * so per-component Esc handlers further down never double-act.
 */
export function useKeyboard(): void {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pathRef = useRef(pathname);
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => {
    pathRef.current = pathname;
    navigateRef.current = navigate;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = resolveKeyAction(e);
      if (!action) return;

      const ui = useUi.getState();
      const go = navigateRef.current;
      const { layer, nodeId } = parseRoute(pathRef.current);

      if (action.type === 'escape') {
        if (ui.searchOpen) {
          e.stopPropagation();
          ui.setSearchOpen(false);
          return;
        }
        if (ui.videoExpanded) {
          // The player owns Esc while expanded (it registers its own capture
          // listener after this one). Only if nothing claimed it do we close.
          window.setTimeout(() => {
            if (useUi.getState().videoExpanded) useUi.getState().setVideoExpanded(false);
          }, 0);
          return;
        }
        if (nodeId && layer) {
          e.stopPropagation();
          go(layer.path);
          return;
        }
        if (ui.presentation) {
          e.stopPropagation();
          ui.setPresentation(false);
          track('presentation_toggle', { on: false });
        }
        return;
      }

      // Typing, the search dialog and an expanded video own their own keys.
      if (isTypingTarget(e.target) || ui.searchOpen || ui.videoExpanded) return;
      if (!layer) return;

      switch (action.type) {
        case 'layer': {
          const target = action.dir < 0 ? getPrevLayer(layer.id) : getNextLayer(layer.id);
          if (!target) return;
          e.preventDefault();
          e.stopPropagation();
          ui.setVideoExpanded(false);
          // Stage emits `layer_view` with this intent.
          ui.setNavIntent('keyboard', target.path);
          go(target.path);
          return;
        }
        case 'sibling': {
          const target = nextSibling(getNodes(layer.id), nodeId, action.dir);
          if (!target) return;
          e.preventDefault();
          e.stopPropagation();
          const path = `/${target.layerId}/${target.id}`;
          ui.setNavIntent('keyboard', path);
          go(path);
          return;
        }
        case 'enter': {
          // A focused button/link keeps its native Enter (a Tab-highlighted node card included).
          if (nodeId || isInteractiveTarget(e.target)) return;
          const first = getNodes(layer.id)[0];
          if (!first) return;
          e.preventDefault();
          const path = `/${first.layerId}/${first.id}`;
          ui.setNavIntent('keyboard', path);
          go(path);
          return;
        }
        case 'search':
          e.preventDefault();
          ui.setSearchOpen(true);
          return;
        case 'panel':
          if (ui.presentation) return;
          e.preventDefault();
          if (action.side === 'left') ui.toggleLeft();
          else ui.toggleRight();
          return;
        case 'emphasis':
          if (!layer.hasEmphasis || ui.emphasis === action.value) return;
          e.preventDefault();
          ui.setEmphasis(action.value);
          track('emphasis_change', { value: action.value });
          return;
        case 'presentation': {
          e.preventDefault();
          const on = !ui.presentation;
          ui.setPresentation(on);
          track('presentation_toggle', { on });
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
