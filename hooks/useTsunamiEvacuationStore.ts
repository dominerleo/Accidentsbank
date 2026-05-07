"use client";

import { create } from "zustand";

export interface TsunamiEvacuationItem {
  id: string;
  category: string;
  sourceType: string;
  sourceName: string;
  displayAddress: string;
  sido: string | null;
  sigungu: string | null;
  eupmyeondong: string | null;
  ri: string | null;
  latitude: number;
  longitude: number;
  /** ISO timestamp */
  fetchedAt: string;
}

interface TsunamiEvacuationState {
  /** 레이어 표시 여부. 기본 OFF — 사용자가 명시적으로 켤 때만 데이터 로드. */
  visible: boolean;
  /** 캐시 결과(좌표 있는 항목만). */
  items: TsunamiEvacuationItem[];
  /** 클릭한 마커. 팝업 표시. */
  selectedId: string | null;

  loading: boolean;
  loaded: boolean;
  error: string | null;

  setVisible: (v: boolean) => void;
  toggleVisible: () => void;
  setSelectedId: (id: string | null) => void;
  loadCache: (opts?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

/**
 * 지진해일 대피지구 레이어 store.
 * 공공안전(성범죄자) store 와 동일한 패턴이지만 category 만 다름.
 * 캐시 API: GET /api/public-safety/address-cache?category=tsunami_evacuation_site
 */
export const useTsunamiEvacuationStore = create<TsunamiEvacuationState>(
  (set, get) => ({
    visible: false,
    items: [],
    selectedId: null,

    loading: false,
    loaded: false,
    error: null,

    setVisible: (visible) => {
      const wasVisible = get().visible;
      set({ visible });
      if (visible && !wasVisible) {
        void get().loadCache();
      }
    },

    toggleVisible: () => {
      const next = !get().visible;
      get().setVisible(next);
    },

    setSelectedId: (selectedId) => set({ selectedId }),

    loadCache: async (opts) => {
      const { loaded, loading } = get();
      if (loading) return;
      if (loaded && !opts?.force) return;

      set({ loading: true, error: null });
      try {
        const res = await fetch(
          "/api/public-safety/address-cache?category=tsunami_evacuation_site&limit=5000",
          { cache: "no-store" }
        );
        if (!res.ok) {
          set({
            loading: false,
            loaded: true,
            error: `tsunami-evacuation request failed: ${res.status}`,
            items: [],
          });
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          items?: TsunamiEvacuationItem[];
          error?: string;
        };
        if (json.ok === false) {
          set({
            loading: false,
            loaded: true,
            error: json.error ?? "tsunami-evacuation returned ok:false",
            items: [],
          });
          return;
        }
        set({
          loading: false,
          loaded: true,
          error: null,
          items: Array.isArray(json.items) ? json.items : [],
        });
      } catch (e) {
        set({
          loading: false,
          loaded: true,
          error: e instanceof Error ? e.message : String(e),
          items: [],
        });
      }
    },

    reset: () =>
      set({
        visible: false,
        items: [],
        selectedId: null,
        loading: false,
        loaded: false,
        error: null,
      }),
  })
);
