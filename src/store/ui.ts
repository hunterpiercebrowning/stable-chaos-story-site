import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Density, Emphasis } from '../data/types';

/**
 * Everything that is *not* in the URL. `layerId` and `focusedNodeId` come from
 * React Router params — never mirror them here.
 *
 * `density` and the two panel flags persist to localStorage so a presenter's
 * setup survives a reload; transient flags (search, video, presentation) do not.
 */
export interface UiState {
  emphasis: Emphasis;
  density: Density;
  leftOpen: boolean;
  rightOpen: boolean;
  presentation: boolean;
  searchOpen: boolean;
  videoExpanded: boolean;

  setEmphasis: (emphasis: Emphasis) => void;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
  setLeftOpen: (open: boolean) => void;
  toggleLeft: () => void;
  setRightOpen: (open: boolean) => void;
  toggleRight: () => void;
  setPresentation: (on: boolean) => void;
  togglePresentation: () => void;
  setSearchOpen: (open: boolean) => void;
  setVideoExpanded: (expanded: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  emphasis: 'all' as Emphasis,
  density: 'compressed' as Density,
  leftOpen: true,
  rightOpen: true,
  presentation: false,
  searchOpen: false,
  videoExpanded: false,
};

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setEmphasis: (emphasis) => set({ emphasis }),
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
      togglePresentation: () => get().setPresentation(!get().presentation),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setVideoExpanded: (videoExpanded) => set({ videoExpanded }),
      reset: () => set(INITIAL),
    }),
    {
      name: 'sc-ui',
      version: 1,
      partialize: (s) => ({ density: s.density, leftOpen: s.leftOpen, rightOpen: s.rightOpen }),
    },
  ),
);
