"use client";

import { create } from "zustand";

interface SidebarState {
  /** 모바일에서만 의미 있음. 데스크탑에서는 항상 노출. */
  open: boolean;
  /** 데스크탑 우측 사이드바 접힘 상태. */
  desktopCollapsed: boolean;
  setOpen: (v: boolean) => void;
  setDesktopCollapsed: (v: boolean) => void;
  toggle: () => void;
  toggleDesktop: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  open: false,
  desktopCollapsed: false,
  setOpen: (open) => set({ open }),
  setDesktopCollapsed: (desktopCollapsed) => set({ desktopCollapsed }),
  toggle: () => set({ open: !get().open }),
  toggleDesktop: () =>
    set({ desktopCollapsed: !get().desktopCollapsed }),
}));
