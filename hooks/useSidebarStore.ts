"use client";

import { create } from "zustand";

interface SidebarState {
  /** 모바일에서만 의미 있음. 데스크탑에서는 항상 노출. */
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
}));
