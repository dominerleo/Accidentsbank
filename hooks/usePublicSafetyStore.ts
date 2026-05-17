"use client";

import { create } from "zustand";

export interface PublicSafetyAddressItem {
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

interface PublicSafetyState {
  /** 레이어 표시 여부. 기본 OFF — 사용자가 명시적으로 켤 때만 데이터 로드. */
  visible: boolean;
  /** 캐시 결과(좌표 있는 항목만). */
  items: PublicSafetyAddressItem[];
  /** 클릭한 마커. 팝업 표시에 사용. */
  selectedId: string | null;

  loading: boolean;
  loaded: boolean;
  /** API 실패 등은 비치명적으로 처리: 메시지만 보관하고 지도는 정상 동작 유지. */
  error: string | null;

  setVisible: (v: boolean) => void;
  toggleVisible: () => void;
  setSelectedId: (id: string | null) => void;

  /** 보이기 ON 으로 전환 시 자동 호출. 이미 로드 했다면 재요청은 force=true 일 때만. */
  loadCache: (opts?: { force?: boolean }) => Promise<void>;
  reset: () => void;
}

export const usePublicSafetyStore = create<PublicSafetyState>((set, get) => ({
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
      const res = await fetch("/api/public-safety/address-cache", {
        cache: "no-store",
      });
      // 비치명적: 4xx/5xx 일 때도 지도는 살아있어야 한다.
      if (!res.ok) {
        const msg = `address-cache request failed: ${res.status}`;
        set({
          loading: false,
          loaded: true,
          error: msg,
          items: [],
        });
        return;
      }
      const json = (await res.json()) as {
        ok?: boolean;
        items?: PublicSafetyAddressItem[];
        error?: string;
      };
      if (json.ok === false) {
        set({
          loading: false,
          loaded: true,
          error: json.error ?? "address-cache returned ok:false",
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
}));
