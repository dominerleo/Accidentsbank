"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppLocale } from "@/types/locale";

interface LocaleState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "ko",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "accidents-bank-locale",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
