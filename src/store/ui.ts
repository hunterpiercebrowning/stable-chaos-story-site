import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Density } from '../data/types';

/**
 * Everything that is *not* in the URL. `layerId` and `focusedNodeId` come from
 * React Router params — never mirror them here.
 *
 * The two panel flags persist to localStorage so a presenter's
 * setup survives a reload; transient flags (search, video, presentation) do not.
 */
export interface UiState {
  density: Density;
  leftOpen: boolean;
  rightOpen: boolean;
  presentation: boolean;
  searchOpen: boolean;
  videoExpanded: boolean;

  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  setLeftOpen: (open: boolean) => void;
  toggleLeft: () => void;
  setRightOpen: (open: boolean) => void;
  toggleRight: () => void;
  setPresentation: (on: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setVideoExpanded: (expanded: boolean) => void;
  reset: () => void;

  /* ── WS6 appends ── */
  /**
   * Left-nav groups opened or closed by hand, per layer id. Absent = open only
   * for the current layer. Cleared whenever the current layer changes.
   */
  navGroups: Record<string, boolean>;
  setNavGroup: (layerId: string, open: boolean) => void;
  resetNavGroups: () => void;

  /* ── WS11 appends ── */
  /**
   * How the *next* route change was triggered. The control that navigates
   * records it just before calling `navigate()`; `Stage` / `FocusFrame` read it
   * through `navVia()` when they emit `layer_view` / `node_focus`, so each
   * navigation is tracked exactly once with the right `via`.
   */
  navIntent: NavIntent | null;
  setNavIntent: (via: NavVia, path: string) => void;
  /**
   * A dialog that owns the keyboard is open (the products gallery lightbox).
   * The global key map stays out of the way while it is set, the way it does
   * for an expanded video.
   */
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

/** `via` values of the `layer_view` / `node_focus` events (build plan §6, plus `click` for card/rail clicks). */
export type NavVia = 'arrow' | 'nav' | 'search' | 'url' | 'keyboard' | 'related' | 'click';

export interface NavIntent {
  via: NavVia;
  /** The pathname the control navigated to. */
  path: string;
  at: number;
}

/** An intent older than this is stale (the route change it described already happened). */
export const NAV_INTENT_TTL_MS = 2_000;

const INITIAL = {
  density: 'compressed' as Density,
  leftOpen: true,
  rightOpen: true,
  presentation: false,
  searchOpen: false,
  videoExpanded: false,
  navGroups: {} as Record<string, boolean>,
  navIntent: null as NavIntent | null,
  modalOpen: false,
};

/**
 * Pure: the `via` an intent explains for `path`, else `'url'` (typed address,
 * reload, back/forward). A layer path also matches an intent that targets one
 * of its nodes (`/sectors` ← `/sectors/biosecurity`), so a nav click straight
 * to a node in another layer reports `nav` on both events.
 */
export function viaFor(intent: NavIntent | null, path: string, now = Date.now()): NavVia {
  if (!intent || now - intent.at > NAV_INTENT_TTL_MS) return 'url';
  if (intent.path === path) return intent.via;
  // `/sectors` ← `/sectors/biosecurity`; the welcome path `/` has no nodes.
  if (path === '/' || path.endsWith('/')) return 'url';
  return intent.path.startsWith(`${path}/`) ? intent.via : 'url';
}

/** `viaFor` against the live store. */
export function navVia(path: string): NavVia {
  return viaFor(useUi.getState().navIntent, path);
}

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setDensity: (density) => set({ density }),
      toggleDensity: () =>
        set({ density: get().density === 'compressed' ? 'expanded' : 'compressed' }),
      setLeftOpen: (leftOpen) => set({ leftOpen }),
      toggleLeft: () => set({ leftOpen: !get().leftOpen }),
      setRightOpen: (rightOpen) => set({ rightOpen }),
      toggleRight: () => set({ rightOpen: !get().rightOpen }),
      setPresentation: (presentation) =>
        set(
          presentation
            ? { presentation, leftOpen: false, rightOpen: false }
            : { presentation, leftOpen: true, rightOpen: true },
        ),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setVideoExpanded: (videoExpanded) => set({ videoExpanded }),
      reset: () => set(INITIAL),

      /* ── WS6 appends ── */
      setNavGroup: (layerId, open) => set({ navGroups: { ...get().navGroups, [layerId]: open } }),
      resetNavGroups: () => set({ navGroups: {} }),

      /* ── WS11 appends ── */
      setNavIntent: (via, path) => set({ navIntent: { via, path, at: Date.now() } }),
      setModalOpen: (modalOpen) => set({ modalOpen }),
    }),
    {
      name: 'sc-ui',
      // v2: density is no longer persisted. Every visit starts on Overview; the
      // toggle only exists on Our Holdings and its choice lasts the session.
      version: 2,
      migrate: (persisted) => {
        const stored = (persisted ?? {}) as Partial<Pick<UiState, 'leftOpen' | 'rightOpen'>>;
        return { leftOpen: stored.leftOpen ?? INITIAL.leftOpen, rightOpen: stored.rightOpen ?? INITIAL.rightOpen };
      },
      partialize: (s) => ({ leftOpen: s.leftOpen, rightOpen: s.rightOpen }),
    },
  ),
);
